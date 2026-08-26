// Node 脚本：随机生成「不太规则的六面体」OBJ + 24 色 MTL，写入 src/assets/OBJFormat/
// 每次运行随机生成不同的形状（Math.random，无需命令行参数），
// MTL 在脚本内部随 OBJ 一并生成，始终配套。
// 运行：npm run gen:obj
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const outDir = resolve(projectRoot, 'src/assets/OBJFormat');
mkdirSync(outDir, {recursive: true});

const w = 2, h = 1, d = 1, jitter = 0.35, bulge = 0.3;
const x = w / 2, y = h / 2, z = d / 2;

// 8 个基准角点
const corners = [
    [-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z],
    [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z],
];
// 真正随机：每次运行生成不同的多面体（无需命令行参数）
const jittered = corners.map((c) => [
    c[0] + (Math.random() * 2 - 1) * jitter,
    c[1] + (Math.random() * 2 - 1) * jitter,
    c[2] + (Math.random() * 2 - 1) * jitter,
]);

// 6 个面各自引用的 4 个角点
const faceCornerIdx = [
    [0, 1, 2, 3], // 后 -z
    [4, 5, 6, 7], // 前 +z
    [0, 1, 5, 4], // 下 -y
    [3, 2, 6, 7], // 上 +y
    [0, 3, 7, 4], // 左 -x
    [1, 2, 6, 5], // 右 +x
];
const faceNames = ['Face0', 'Face1', 'Face2', 'Face3', 'Face4', 'Face5'];
const faceNormals = [
    [0, 0, -1], [0, 0, 1], [0, -1, 0], [0, 1, 0], [-1, 0, 0], [1, 0, 0],
];

// 1) 生成 OBJ：每个逻辑面 = 4 角点 + 1 中心顶点，细分为 4 个子面，每个子面独立 usemtl
const lines = ['o CodeBox', 'mtllib box-from-code.mtl'];
const usemtlNames = [];
let base = 1;
faceCornerIdx.forEach((cidx, fi) => {
    const quad = cidx.map((ci) => jittered[ci]);
    const cx = (quad[0][0] + quad[1][0] + quad[2][0] + quad[3][0]) / 4;
    const cy = (quad[0][1] + quad[1][1] + quad[2][1] + quad[3][1]) / 4;
    const cz = (quad[0][2] + quad[1][2] + quad[2][2] + quad[3][2]) / 4;
    const n = faceNormals[fi];
    const center = [cx + n[0] * bulge, cy + n[1] * bulge, cz + n[2] * bulge];

    for (const v of quad) lines.push(`v ${v[0].toFixed(4)} ${v[1].toFixed(4)} ${v[2].toFixed(4)}`);
    lines.push(`v ${center[0].toFixed(4)} ${center[1].toFixed(4)} ${center[2].toFixed(4)}`);

    const c = base + 4;
    const subFaces = [
        [base, base + 1, c],
        [base + 1, base + 2, c],
        [base + 2, base + 3, c],
        [base + 3, base, c],
    ];
    subFaces.forEach((tri, ti) => {
        const name = `${faceNames[fi]}_${ti}`;
        usemtlNames.push(name);
        lines.push(`usemtl ${name}`);
        lines.push(`f ${tri[0]} ${tri[1]} ${tri[2]}`);
    });
    base += 5;
});
const objText = lines.join('\n') + '\n';
writeFileSync(resolve(outDir, 'box-from-code.obj'), objText, 'utf8');

// 2) 生成 24 色 MTL，每个子面一种颜色
function hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hp = (((h % 360) + 360) % 360) / 60;
    const x2 = c * (1 - Math.abs((hp % 2) - 1));
    let r, g, b;
    if (hp < 1) [r, g, b] = [c, x2, 0];
    else if (hp < 2) [r, g, b] = [x2, c, 0];
    else if (hp < 3) [r, g, b] = [0, c, x2];
    else if (hp < 4) [r, g, b] = [0, x2, c];
    else if (hp < 5) [r, g, b] = [x2, 0, c];
    else [r, g, b] = [c, 0, x2];
    const m = l - c / 2;
    return [r + m, g + m, b + m];
}

const N = usemtlNames.length;
const mtlLines = [`# 由代码生成的 MTL 材质库（共 ${N} 个材质，每个子面一种颜色）`];
for (let i = 0; i < N; i++) {
    const [r, g, b] = hslToRgb((i / N) * 360, 0.65, 0.55);
    mtlLines.push(
        `newmtl ${usemtlNames[i]}`,
        `Ka 0.1 0.1 0.1`,
        `Kd ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`,
        `Ks 0.2 0.2 0.2`,
        `Ns 30`,
        `d 1.0`,
        `illum 2`,
    );
}
writeFileSync(resolve(outDir, 'box-from-code.mtl'), mtlLines.join('\n') + '\n', 'utf8');

console.log(`已生成不规则六面体 OBJ：${resolve(outDir, 'box-from-code.obj')}`);
console.log(`已生成 24 色 MTL：${resolve(outDir, 'box-from-code.mtl')}`);
