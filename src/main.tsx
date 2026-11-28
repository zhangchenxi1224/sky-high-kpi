import React from 'react';
import {createRoot} from 'react-dom/client';
import {App} from './ui/App';
import './style.css';
import './ui/pixel.css';
import {loadPixelFont} from './features/pixel-font';
const root=createRoot(document.getElementById('root')!);
void loadPixelFont().then(()=>root.render(<React.StrictMode><App/></React.StrictMode>)).catch(()=>root.render(<div className="pixel-modal">像素字体加载失败，请刷新重试。<button className="pixel-button gold" onClick={()=>location.reload()}>重新加载</button></div>));
