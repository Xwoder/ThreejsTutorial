import type {Lesson} from '../types';
import {textureProcedural} from './textures';
import {pbrGrass} from './pbrGrass';

export const textures: Lesson = {
    id: 'material/textures',
    title: '纹理贴图',
    description: `
    <h2>纹理贴图</h2>
    <p>纹理是把图片"贴"到几何体表面的技术，让物体拥有细节。本小节包含两个示例：</p>
    <ul>
      <li><b>程序化生成纹理</b>：用 <code>CanvasTexture</code> 在运行时绘制棋盘格，无需外部图片，并演示 UV 坐标与纹理平铺。</li>
      <li><b>PBR 草地材质（平面）</b>：用完整的 PBR 贴图链（albedo / normal / roughness / metallic / ao / height）在平面上渲染草叶。</li>
    </ul>
    <p>点击左侧子章节查看对应示例。</p>
  `,
    children: [textureProcedural, pbrGrass],
};
