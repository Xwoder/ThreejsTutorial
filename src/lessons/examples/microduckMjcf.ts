import * as THREE from 'three';

/**
 * 极简 MuJoCo MJCF 解析器（仅覆盖 microduck 用到的子集）。
 *
 * 把 MJCF 的 <body>/<joint>/<geom type="mesh"> 树解析为带层级关系的
 * MjcfBody 节点，并记录关键帧（keyframe）的 qpos，供 Three.js 重建机器人。
 *
 * 坐标约定：MJCF 与 Three.js 都是「米 + Y-up」，因此 pos/quat 可直接使用。
 * 注意 MuJoCo 的 quat 写法是「w x y z」，而 Three.Quaternion 构造是「x y z w」，
 * 解析时需要重排分量顺序。
 */

export interface MjcfJoint {
    name: string;
    /** 相对父 body 的旋转轴（单位向量） */
    axis: THREE.Vector3;
    /** 关节相对 body 原点的枢轴位置（多为 0 0 0） */
    pos: THREE.Vector3;
    range: [number, number];
}

export interface MjcfGeom {
    /** mesh 文件名（不含扩展名），对应 <asset><mesh file="x.stl"/> */
    mesh: string;
    /** 相对 body 的平移与朝向（w x y z） */
    pos: THREE.Vector3;
    quat: THREE.Quaternion; // 已转换为 Three 的 x y z w
}

export interface MjcfBody {
    name: string;
    pos: THREE.Vector3;
    quat: THREE.Quaternion; // 已转换为 Three 的 x y z w
    joints: MjcfJoint[];
    geoms: MjcfGeom[];
    children: MjcfBody[];
}

export interface MjcfKeyframe {
    name: string;
    /** 根 body 世界位姿：x y z w x y z */
    rootPos: THREE.Vector3;
    rootQuat: THREE.Quaternion;
    /** 与「带 joint 的 body 顺序」一一对应的关节角度（弧度） */
    jointValues: number[];
}

export interface MjcfModel {
    /** 根 body（通常名为 worldbody 下第一个 body，这里直接取首个 body 作为根） */
    root: MjcfBody;
    /** 按声明顺序收集到的全部「带 joint 的 body」对应的关节 */
    joints: MjcfJoint[];
    keyframes: MjcfKeyframe[];
    /** mesh 文件名（不含扩展名）→ STL 文件名（含扩展名，来自 <mesh file>） */
    meshFiles: Map<string, string>;
}

/** MuJoCo quat "w x y z" → Three.Quaternion(x y z w) */
function parseQuat(v: string | null): THREE.Quaternion {
    if (!v) return new THREE.Quaternion(); // 单位四元数
    const [w, x, y, z] = v.trim().split(/\s+/).map(Number);
    return new THREE.Quaternion(x, y, z, w);
}

function parseVec3(v: string | null): THREE.Vector3 {
    if (!v) return new THREE.Vector3();
    const [x, y, z] = v.trim().split(/\s+/).map(Number);
    return new THREE.Vector3(x, y, z);
}

function parseJoint(el: Element): MjcfJoint {
    const axisStr = el.getAttribute('axis') ?? '0 0 1';
    const [ax, ay, az] = axisStr.trim().split(/\s+/).map(Number);
    const rangeStr = el.getAttribute('range');
    let range: [number, number] = [-Infinity, Infinity];
    if (rangeStr) {
        const [lo, hi] = rangeStr.trim().split(/\s+/).map(Number);
        range = [lo, hi];
    }
    return {
        name: el.getAttribute('name') ?? 'unnamed',
        axis: new THREE.Vector3(ax, ay, az).normalize(),
        pos: parseVec3(el.getAttribute('pos')),
        range,
    };
}

function parseGeom(el: Element): MjcfGeom | null {
    if (el.getAttribute('type') !== 'mesh') return null;
    const mesh = el.getAttribute('mesh');
    if (!mesh) return null;
    return {
        mesh,
        pos: parseVec3(el.getAttribute('pos')),
        quat: parseQuat(el.getAttribute('quat')),
    };
}

/** 递归解析 <body> 节点；flatJoints 用于按声明顺序收集关节 */
function parseBody(el: Element, flatJoints: MjcfJoint[]): MjcfBody {
    const joints = Array.from(el.children)
        .filter((c) => c.tagName.toLowerCase() === 'joint')
        .map((j) => {
            const jt = parseJoint(j);
            flatJoints.push(jt);
            return jt;
        });

    const geoms = Array.from(el.children)
        .filter((c) => c.tagName.toLowerCase() === 'geom')
        .map((g) => parseGeom(g))
        .filter((g): g is MjcfGeom => g !== null);

    const children = Array.from(el.children)
        .filter((c) => c.tagName.toLowerCase() === 'body')
        .map((b) => parseBody(b, flatJoints));

    return {
        name: el.getAttribute('name') ?? 'body',
        pos: parseVec3(el.getAttribute('pos')),
        quat: parseQuat(el.getAttribute('quat')),
        joints,
        geoms,
        children,
    };
}

export function parseMjcf(xmlText: string): MjcfModel {
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    const mujoco = doc.querySelector('mujoco');
    if (!mujoco) throw new Error('MJCF 解析失败：找不到 <mujoco> 根节点');

    // mesh 文件映射：<asset><mesh file="x.stl"/>（可能有 name 也可能没有）
    const meshFiles = new Map<string, string>();
    doc.querySelectorAll('asset > mesh').forEach((m) => {
        const file = m.getAttribute('file')!;
        const name = m.getAttribute('name') ?? file.replace(/\.stl$/i, '');
        meshFiles.set(name, file);
    });

    // 根 body：worldbody 下第一个 body
    const worldbody = mujoco.querySelector('worldbody');
    const rootEl = worldbody?.querySelector('body');
    if (!rootEl) throw new Error('MJCF 解析失败：找不到 <body>');
    const flatJoints: MjcfJoint[] = [];
    const root = parseBody(rootEl, flatJoints);

    // 关键帧
    const keyframes: MjcfKeyframe[] = [];
    mujoco.querySelectorAll('keyframe > key').forEach((k) => {
        const name = k.getAttribute('name')!;
        const qposStr = k.getAttribute('qpos');
        if (!qposStr) return;
        const vals = qposStr.trim().split(/\s+/).map(Number);
        const [px, py, pz, qw, qx, qy, qz] = vals;
        keyframes.push({
            name,
            rootPos: new THREE.Vector3(px, py, pz),
            rootQuat: new THREE.Quaternion(qx, qy, qz, qw),
            jointValues: vals.slice(7),
        });
    });

    return {root, joints: flatJoints, keyframes, meshFiles};
}

/**
 * 把 MjcfBody 树构建为 Three.js 对象树。
 * 返回根 Object3D 以及一个「关节名 → 用于施加旋转的 Object3D」的映射，
 * 供按关键帧 qpos 驱动姿态。
 */
export interface BuiltRobot {
    root: THREE.Object3D;
    /** joint 名称 → 该关节的旋转枢轴 Object3D（初始绕 axis 旋转角度 0） */
    jointPivots: Map<string, THREE.Object3D>;
    /** 与 MjcfModel.joints 顺序一致的枢轴列表（用于按 qpos 顺序驱动） */
    jointOrder: THREE.Object3D[];
}

/**
 * @param model     解析后的 MJCF 模型
 * @param loadMesh  (meshName, fileName) => Promise<THREE.BufferGeometry> 异步加载 STL
 * @param onProgress 每放置一个 geom 回调（用于进度/调试）
 */
export async function buildRobot(
    model: MjcfModel,
    loadMesh: (meshName: string, fileName: string) => Promise<THREE.BufferGeometry>,
    palette: ((meshName: string) => THREE.Material) | null = null,
): Promise<BuiltRobot> {
    const jointPivots = new Map<string, THREE.Object3D>();
    const jointOrder: THREE.Object3D[] = [];

    const build = async (body: MjcfBody): Promise<THREE.Object3D> => {
        const group = new THREE.Object3D();
        group.name = body.name;
        group.position.copy(body.pos);
        group.quaternion.copy(body.quat);

        // body 上的关节：每个 joint 包一层枢轴 Object3D，绕 joint.axis 旋转
        // 注意：一个 body 若有多个 joint，按 MJCF 它们依次作用（这里每个 joint 一层）
        let parent: THREE.Object3D = group;
        for (const jt of body.joints) {
            const pivot = new THREE.Object3D();
            pivot.name = `joint:${jt.name}`;
            pivot.position.copy(jt.pos);
            pivot.userData.axis = jt.axis;
            parent.add(pivot);
            jointPivots.set(jt.name, pivot);
            jointOrder.push(pivot);
            parent = pivot;
        }

        // geom 网格
        for (const g of body.geoms) {
            const fileName = model.meshFiles.get(g.mesh) ?? `${g.mesh}.stl`;
            try {
                const geom = await loadMesh(g.mesh, fileName);
                const mat =
                    palette?.(g.mesh) ??
                    new THREE.MeshStandardMaterial({color: 0x9aa3b2, metalness: 0.1, roughness: 0.7});
                const mesh = new THREE.Mesh(geom, mat);
                mesh.position.copy(g.pos);
                mesh.quaternion.copy(g.quat);
                parent.add(mesh);
            } catch (e) {
                console.warn(`[microduck] 加载网格 "${g.mesh}" (${fileName}) 失败`, e);
            }
        }

        for (const child of body.children) {
            parent.add(await build(child));
        }
        return group;
    };

    const root = await build(model.root);
    return {root, jointPivots, jointOrder};
}

/** 按关键帧设置机器人姿态 */
export function applyKeyframe(built: BuiltRobot, kf: MjcfKeyframe): void {
    // 根 body 世界位姿（关键帧里根 body 的 pos/quat 是世界坐标）
    // 注意：解析时 root 已经是 worldbody 下第一个 body，其 pos/quat 在 MJCF 里
    // 就是相对 world 的，因此直接设置到 built.root 上。
    built.root.position.copy(kf.rootPos);
    built.root.quaternion.copy(kf.rootQuat);
    // 依次驱动各关节枢轴绕自身 axis 旋转
    for (let i = 0; i < built.jointOrder.length; i++) {
        const pivot = built.jointOrder[i];
        const angle = kf.jointValues[i] ?? 0;
        const axis = (pivot.userData.axis as THREE.Vector3) ?? new THREE.Vector3(0, 0, 1);
        pivot.quaternion.setFromAxisAngle(axis, angle);
    }
}
