/**
 * 极简 OBJ 生成器：用代码直接构造 OBJ 文本，无需任何 3D 库。
 * OBJ 是纯文本格式，核心元素：
 *   v  x y z       顶点位置
 *   vt u v         纹理坐标（可选）
 *   vn x y z       顶点法线（可选）
 *   f v/vt/vn ...  面（顶点索引，从 1 开始）
 */

export interface ObjMesh {
    name?: string;
    /** 顶点 [x,y,z, x,y,z, ...] */
    positions: number[];
    /** 索引三角形 [a,b,c, ...]，从 0 开始（函数内部会 +1 转换为 OBJ 的 1-based） */
    indices: number[];
}

/** 把网格数据拼接成 OBJ 字符串 */
export function buildObj(mesh: ObjMesh): string {
    const lines: string[] = [];

    if (mesh.name) {
        lines.push(`o ${mesh.name}`);
    }

    // 顶点
    for (let i = 0; i < mesh.positions.length; i += 3) {
        lines.push(
            `v ${mesh.positions[i]} ${mesh.positions[i + 1]} ${mesh.positions[i + 2]}`
        );
    }

    // 面（OBJ 索引从 1 开始）
    for (let i = 0; i < mesh.indices.length; i += 3) {
        const a = mesh.indices[i] + 1;
        const b = mesh.indices[i + 1] + 1;
        const c = mesh.indices[i + 2] + 1;
        lines.push(`f ${a} ${b} ${c}`);
    }

    return lines.join("\n") + "\n";
}

/** 由宽、高、深生成一个轴对齐立方体的网格数据 */
export function makeBox(
    w = 1,
    h = 1,
    d = 1,
    name = "Box"
): ObjMesh {
    const x = w / 2;
    const y = h / 2;
    const z = d / 2;

    // 8 个顶点
    const positions = [
        -x, -y, -z, // 0
        x, -y, -z, // 1
        x, y, -z, // 2
        -x, y, -z, // 3
        -x, -y, z, // 4
        x, -y, z, // 5
        x, y, z, // 6
        -x, y, z, // 7
    ];

    // 12 个三角形（36 个索引）
    const indices = [
        0, 1, 2, 0, 2, 3, // 后
        4, 6, 5, 4, 7, 6, // 前
        0, 4, 5, 0, 5, 1, // 下
        3, 2, 6, 3, 6, 7, // 上
        0, 3, 7, 0, 7, 4, // 左
        1, 5, 6, 1, 6, 2, // 右
    ];

    return {name, positions, indices};
}

/** 在浏览器/Node 中触发下载 */
export function downloadObj(objText: string, filename = "model.obj"): void {
    const blob = new Blob([objText], {type: "text/plain"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/** 一个面分组：一组三角形 + 对应的材质名 */
export interface FaceGroup {
    material: string;
    /** 该面的三角形索引 [a,b,c, ...]，从 0 开始 */
    indices: number[];
}

/** 带「按面分组材质」的网格数据 */
export interface ObjMeshFaces extends ObjMesh {
    groups: FaceGroup[];
}

/** 拼接「按面分组材质」的 OBJ 文本（含 usemtl）。
 *  每个逻辑面会被进一步细分为若干子面：每 3 个索引一个三角形就对应一个子面，
 *  这样凸出来的每个小三角都可以拥有独立颜色。
 */
export function buildObjFaces(mesh: ObjMeshFaces, subFacesPerGroup = 1): string {
    const lines: string[] = [];
    if (mesh.name) lines.push(`o ${mesh.name}`);
    lines.push(`mtllib ${mesh.name ?? "model"}.mtl`);

    for (let i = 0; i < mesh.positions.length; i += 3) {
        lines.push(`v ${mesh.positions[i]} ${mesh.positions[i + 1]} ${mesh.positions[i + 2]}`);
    }

    for (const g of mesh.groups) {
        for (let i = 0; i < g.indices.length; i += 3) {
            const subIndex = Math.floor(i / 3);
            // subFacesPerGroup=1 时沿用原材质名；否则派生子材质名 Face0_0..Face0_3
            const material = subFacesPerGroup <= 1
                ? g.material
                : `${g.material}_${subIndex % subFacesPerGroup}`;
            lines.push(`usemtl ${material}`);
            const a = g.indices[i] + 1;
            const b = g.indices[i + 1] + 1;
            const c = g.indices[i + 2] + 1;
            lines.push(`f ${a} ${b} ${c}`);
        }
    }

    return lines.join("\n") + "\n";
}

/** 把一组逻辑面材质扩展为每个子面独立材质（如 Face0 → Face0_0..Face0_3） */
export function subdivideFaceMaterials(faceNames: string[], subCount: number): string[] {
    const out: string[] = [];
    for (const name of faceNames) {
        for (let i = 0; i < subCount; i++) out.push(`${name}_${i}`);
    }
    return out;
}

/** 一个 MTL 材质定义 */
export interface MtlMaterial {
    name: string;
    /** 漫反射颜色 [r,g,b]，范围 0~1 */
    kd: [number, number, number];
    /** 环境色（可选） */
    ka?: [number, number, number];
    /** 高光指数（可选） */
    ns?: number;
}

/** 由材质列表拼接 MTL 文本：每个面一种颜色 */
export function buildMtl(materials: MtlMaterial[]): string {
    const lines: string[] = ["# 由代码生成的 MTL 材质库（每个面一种颜色）"];
    for (const m of materials) {
        lines.push(`newmtl ${m.name}`);
        const ka = m.ka ?? [0.1, 0.1, 0.1];
        lines.push(`Ka ${ka[0]} ${ka[1]} ${ka[2]}`);
        lines.push(`Kd ${m.kd[0]} ${m.kd[1]} ${m.kd[2]}`);
        lines.push(`Ks 0.2 0.2 0.2`);
        lines.push(`Ns ${m.ns ?? 30}`);
        lines.push(`d 1.0`);
        lines.push(`illum 2`);
    }
    return lines.join("\n") + "\n";
}

/** 生成 6 个面的彩色材质（红、绿、蓝、黄、青、品红） */
export function boxFaceMaterials(
    names: string[] = ["Face0", "Face1", "Face2", "Face3", "Face4", "Face5"]
): MtlMaterial[] {
    const colors: [number, number, number][] = [
        [0.9, 0.2, 0.2], // 红
        [0.2, 0.8, 0.3], // 绿
        [0.2, 0.4, 0.9], // 蓝
        [0.95, 0.8, 0.2], // 黄
        [0.2, 0.85, 0.85], // 青
        [0.9, 0.3, 0.8], // 品红
    ];
    return names.map((n, i) => ({name: n, kd: colors[i]}));
}

/** HSL -> RGB（h:0~360, s/l:0~1），返回 0~1 的 [r,g,b] */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hp = (((h % 360) + 360) % 360) / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    let r = 0, g = 0, b = 0;
    if (hp < 1) [r, g, b] = [c, x, 0];
    else if (hp < 2) [r, g, b] = [x, c, 0];
    else if (hp < 3) [r, g, b] = [0, c, x];
    else if (hp < 4) [r, g, b] = [0, x, c];
    else if (hp < 5) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    const m = l - c / 2;
    return [r + m, g + m, b + m];
}

/** 为每个子面生成互不相同的颜色（HSL 均匀取色） */
export function subFaceMaterials(names: string[]): MtlMaterial[] {
    const N = names.length;
    return names.map((n, i) => ({
        name: n,
        kd: hslToRgb((i / N) * 360, 0.65, 0.55),
    }));
}
