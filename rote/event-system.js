class EventSystem {
	constructor(){
		this._events = [];
	}
}

EventSystem.prototype.prependListener = function(name, f){
	return this._events[name]
		? this._events[name].unshift(f)
		: this._events[name] = [ f ]
	;
}

EventSystem.prototype.removeListener = function(name, f){
	return this._events[name]
		&& this._events[name].splice(this._events[name].indexOf(f), 1)
	;
}

EventSystem.prototype.on = function(name, f){
	return this._events[name]
		? this._events[name].push(f)
		: this._events[name] = [ f ]
	;
}

EventSystem.prototype.once = function(name, f){
	const _this = this;
	return new Promise(function(rs, rj){
		_this.on(name, function f2(...args){
			_this.removeListener(name, f2);
			f && f.call(_this, ...args);
			rs();
		});
	});
}

EventSystem.prototype.emit = function(name, ...args){
	return (this._events[name] && [ ...this._events[name] ]
		.map(f => f.call(this, ...args))
	) || [];
}
