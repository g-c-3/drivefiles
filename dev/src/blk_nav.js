/* ================= back button / gesture ================= */
/* Every in-app step (a sheet, a viewer, a folder, a tab, a screen) is one entry in this stack, mirrored by one browser history entry.
   Below them sits one guard entry, so the first Back on the very first screen stays in the app and a second quick Back leaves. */
var Nav={st:[],hd:0,armed:false,pend:false,t:null,g:null,lastRoot:0,lastExit:0};
Nav.want=function(){return Nav.armed?Nav.st.length+1:0;};
Nav.push=function(close,kind){var e={close:close,kind:kind||""};Nav.st.push(e);Nav.sched();return e;};
Nav.drop=function(e){var i=Nav.st.indexOf(e);if(i>=0){Nav.st.splice(i,1);Nav.sched();}};
Nav.dropKind=function(k){var n=Nav.st.length;Nav.st=Nav.st.filter(function(e){return e.kind!==k;});if(Nav.st.length!==n)Nav.sched();};
Nav.has=function(k){return Nav.st.some(function(e){return e.kind===k;});};
Nav.clear=function(){if(Nav.st.length){Nav.st=[];Nav.sched();}};
Nav.sched=function(){if(!Nav.t)Nav.t=setTimeout(Nav.sync,0);};
Nav.move=function(to){
  if(to===Nav.hd){Nav.sched();return;}
  Nav.pend=true; var by=to-Nav.hd; Nav.hd=to;
  try{ history.go(by); }catch(e){ Nav.pend=false; }
  clearTimeout(Nav.g); Nav.g=setTimeout(function(){Nav.pend=false;Nav.sched();},700);
};
Nav.sync=function(){
  Nav.t=null; if(Nav.pend||!Nav.armed) return;
  var want=Nav.want();
  try{
    if(want>Nav.hd){ while(Nav.hd<want){Nav.hd++;history.pushState({atlas:1,d:Nav.hd},"");} }
    else if(want<Nav.hd) Nav.move(want);
  }catch(e){ Nav.pend=false; }
};
/* The guard is added on the first tap or key press, because browsers skip history entries that a page adds without any interaction. */
Nav.arm=function(){ if(Nav.armed) return; Nav.armed=true; Nav.sched(); };
["pointerup","touchend","keydown","click"].forEach(function(ev){window.addEventListener(ev,Nav.arm,{capture:true,passive:true});});
window.addEventListener("popstate",function(e){
  if(Nav.pend){ Nav.pend=false; clearTimeout(Nav.g); Nav.sched(); return; }
  var d=(e.state&&e.state.d)||0; Nav.hd=d;
  if(!Nav.armed) return;
  if(d<1){
    /* Back from the first screen: stay unless it is pressed twice in a row */
    var now=Date.now();
    if(now-Nav.lastExit<2500){ Nav.armed=false; history.back(); return; }
    Nav.lastExit=now; toast("Press back again to leave");
    Nav.move(Nav.want()); return;
  }
  while(Nav.st.length>d-1){
    var top=Nav.st.pop(), r;
    try{ r=top.close(); }catch(x){ r=undefined; }
    if(r===false){ Nav.st.push(top); break; }
  }
  if(Nav.want()>d) Nav.move(Nav.want()); else Nav.sched();
});
window.AtlasNav=Nav;
Nav.hd=(history.state&&history.state.d)||0;
if(Nav.hd>0){ Nav.armed=true; Nav.sched(); }
function sessionBack(){
  if(S.ex.running||uploadBusy){ toast("A job is still running. Stop it first, or wait for it to finish.",true); return false; }
  var now=Date.now();
  if(now-Nav.lastRoot>2500){ Nav.lastRoot=now; toast("Press back again to log out"); return false; }
  lockNow();
}

