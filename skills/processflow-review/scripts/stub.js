// Minimal DOM stub to run a canvas-korrektur HTML's inline <script> under node and confirm it renders.
// Used by verify_html.sh. Catches the "blank page" bug (a thrown error during render).
function El(){this.children=[];this.classList={add(){},remove(){},toggle(){}};this.style={};}
El.prototype.appendChild=function(c){this.children.push(c);return c;};
El.prototype.append=function(){for(const a of arguments)this.children.push(a);};
El.prototype.querySelectorAll=function(){return {length:0};};
El.prototype.addEventListener=function(){};
Object.defineProperty(El.prototype,'textContent',{set(v){this._t=v;},get(){return this._t;}});
Object.defineProperty(El.prototype,'innerHTML',{set(v){this._h=v;},get(){return this._h;}});
const store={app:new El()};
global.document={createElement:()=>new El(),getElementById:id=>store[id]||new El(),body:new El()};
global.navigator={};
