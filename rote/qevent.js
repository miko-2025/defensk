/*
*/

window.qeventBubble = function(){

}

window.qeventCheck = function(queries, target, ...args){
}

window.qeventTransform = function(ev){
	return Object.create(ev, {
		currentTarget: null
	})
}

window.qevent = function(event, query, f){
  const _this = this || window;
  let queries = _this.qeventListeners[event];
  //alert(event + ': ' + (queries || []).length);

  // async function breaks this thing because Promise is always true
  try {
    if(f instanceof (async function(){}).constructor){
      const temp = f;
      f = function(...args){
        let ret = undefined;
        args.push(function(v){ ret = v; });
        temp(...args);
        return ret;
      }
    }
  } catch(err){ alert(err); }

  
  if(queries){
    const listeners = queries.find(([ name ]) => name === query);
    if(listeners){
      listeners[1].push(f);
      
      return this;
    }
    
    queries.push([ query, [ f ] ]);
    
    return this;
  }
  
  queries = _this.qeventListeners[event] = [ [ query, [ f ] ] ];
  _this.addEventListener(event, function(ev){
    let parent = ev.target;
    while(parent){
        for(const [ q, fs ] of queries){ // alert(`${parent.getAttribute("class")}:${q}`);
          //if(q != '*') alert(queries.map(q => q[0]));
          /*if(q == ".page.search .abilities > .conic-pbar")
          	alert(parent.classList.toString());*/
          if(parent.matches(q)){ // alert("Match")
            /*if(parent.classList.toString() === 'inner')
              alert(q);*/

            //if(q != '*') alert(q);
            for(const f of fs)
              //alert(f.toString());
              if(f.apply(this, [ev, parent])){
                //alert(f.toString());
                return ev.stopPropagation();
              }
              ;
          }
	}

        // bubble (not exactly)
        parent = parent.parentElement;
    }
  });
  
  return _this;
}

window.qeventListeners = {};
