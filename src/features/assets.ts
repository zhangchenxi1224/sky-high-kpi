// The offline package injects the same assets as data URLs before the application starts.
export function assetUrl(name:string){
  const embedded=(window as unknown as {__ASSETS__?:Record<string,string>;__ROOMS__?:string});
  return embedded.__ASSETS__?.[name]??(name==='rooms.webp'?embedded.__ROOMS__:undefined)??`${import.meta.env.BASE_URL}assets/${name}`;
}
