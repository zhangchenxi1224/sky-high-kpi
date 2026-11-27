import {assetUrl} from './assets';
import {sha256 as fontRevision} from '../../public/assets/campus-pixel-coverage.json';
export const PIXEL_FONT='CampusPixel';
let ready:Promise<void>|undefined;
export function loadPixelFont(){
  return ready??=(async()=>{
    const asset=assetUrl('campus-pixel.woff');
    const source=asset.startsWith('data:')?asset:`${asset}?v=${fontRevision.slice(0,12)}`;
    const font=new FontFace(PIXEL_FONT,`url("${source}")`,{weight:'400',style:'normal'});
    await font.load();document.fonts.add(font);
  })();
}
export const pixelFont=(size:number)=>`${size}px "${PIXEL_FONT}", monospace`;
