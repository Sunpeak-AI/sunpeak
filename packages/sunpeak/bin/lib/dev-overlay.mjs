/**
 * Generate an inline script that shows a dev overlay with resource served timestamp
 * and tool call request timing.
 *
 * The resource timestamp is baked into the HTML at readResource time. Tool timing
 * arrives two ways:
 * 1. Baked-in `toolMs` from readResource time (works when the tool call precedes the
 *    resource read, which is the case for Claude and the inspector's initial render).
 * 2. `_meta._sunpeak.requestTimeMs` on the tool result PostMessage (handles inspector
 *    Re-run and hosts that pass `_meta` through to the resource iframe).
 *
 * @param {number} servedAt - Unix timestamp (ms) when the resource HTML was generated/served.
 * @param {number | null} toolMs - Most recent tool call duration (ms), or null if no call yet.
 * @returns {string} HTML script tag with the dev overlay.
 */
export function getDevOverlayScript(servedAt, toolMs) {
  return `<script>
(function(){
  var servedAt=${servedAt};
  var el=null,hidden=false,lastMs=${toolMs ?? 'null'};
  function fmt(ts){var d=new Date(ts);var h=d.getHours(),m=d.getMinutes(),s=d.getSeconds();return (h<10?'0':'')+h+':'+(m<10?'0':'')+m+':'+(s<10?'0':'')+s}
  function make(){
    var existing=document.getElementById('__sunpeak-dev-timing');
    if(existing)return existing;
    var b=document.createElement('button');b.id='__sunpeak-dev-timing';
    b.style.cssText='position:fixed;bottom:8px;right:8px;z-index:2147483647;display:grid;grid-template-columns:auto auto;gap:0 6px;align-items:baseline;padding:5px 8px;border-radius:6px;border:1px solid rgba(128,128,128,0.25);background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);color:#e5e5e5;font-size:11px;font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;line-height:1.4;cursor:pointer;user-select:none;opacity:0.85;transition:opacity 150ms;';
    b.onmouseenter=function(){b.style.opacity='1'};
    b.onmouseleave=function(){b.style.opacity='0.85'};
    b.onclick=function(){hidden=!hidden;upd()};
    document.body.appendChild(b);return b;
  }
  function upd(){
    if(!el)el=make();
    if(hidden){el.title='Show dev info';el.innerHTML='<span style="grid-column:1/-1;font-size:9px;text-align:center">DEV</span>';return}
    var h='';
    h+='<span style="text-align:right;color:rgba(255,255,255,0.5);white-space:nowrap">Resource:</span><span style="white-space:nowrap">'+fmt(servedAt)+'</span>';
    if(lastMs!=null)h+='<span style="text-align:right;color:rgba(255,255,255,0.5);white-space:nowrap">Tool:</span><span style="white-space:nowrap">'+(lastMs%1===0?lastMs:lastMs.toFixed(1))+'ms</span>';
    el.title='Hide dev info';el.innerHTML=h;
  }
  upd();
  window.addEventListener('message',function(e){
    var d=e.data;if(!d||typeof d!=='object')return;
    if(d.method!=='ui/notifications/tool-result')return;
    var p=d.params;if(!p)return;
    var ms=p._meta&&p._meta._sunpeak&&p._meta._sunpeak.requestTimeMs;
    if(typeof ms==='number'){lastMs=ms;upd()}
  });
})();
</script>`;
}
