const gpu = new GPU.GPU();
const PinusDegreeRadiusXY = gpu.createKernel(function(degree, radius, x, y){
	return [
		x + radius * Math.cos(degree * Math.PI / 180),
		y + radius * Math.sin(degree * Math.PI / 180)
	];
}).setOutput([ 1 ]);
const PinusXYDegree = gpu.createKernel(function(x, y){
	const theta = Math.atan2(y, x) * 180 / Math.PI;
	if(x < 0)
		theta = 180 + theta;
	return theta;
}).setOutput([ 1 ]);

const PinusDistance = gpu.createKernel(function(x, y){
	if(x == 0 || y == 0)
		return 0;

	return Math.sqrt((x * x) + (y * y));
}).setOutput([ 1 ]);

let PinusWithinRadius = gpu.createKernel(function(x, y, r){
	return (((x * x) + (y * y)) < (r * r)) ? 1 : 0;
}).setOutput([ 1 ]);


let _PinusLineIntersect = gpu.createKernel(function(x1, y1, x2, y2, x3, y3, x4, y4){
	// Got this from google search AI summary
	//	- Mkay
	const denominator = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1))



	if (denominator == 0) {
		// Lines are parallel or collinear,
		// no unique intersection point
		return [ 0, 0, 0, 1 ];
	}

	const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3))
		/ denominator;
	const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3))
		/ denominator;

	// Check if intersection occurs within line segments (if applicable)
	if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
		const x = x1 + ua * (x2 - x1);
		const y = y1 + ua * (y2 - y1);
		return [ x, y, 0, 0 ];
	}

	// Intersection occurs outside line segments
	return [ 0, 0, 0, 1 ];
}).setOutput([ 1 ]);

function PinusIsPointOnLineSegment(x, y, x1, y1, x2, y2) {
	const p1 = {
		x,
		y
	}

	const p2 = {
		x: x1,
		y: y1
	}

	const p3 = {
		x: x2,
		y: y2
	}
	// Got this from google search AI summary
	//	- Mkay

	// p1, p2: line segment endpoints {x, y}
	// p3: point to check {x, y}

	// Check for collinearity using slopes
	const slope1 = (p2.y - p1.y) / (p2.x - p1.x);
	const slope2 = (p3.y - p1.y) / (p3.x - p1.x);
	const tolerance = 0.5;
	const tolerance2 = 0.6;

	// Handle vertical lines
	if (p2.x - p1.x === 0) { // Vertical line
		/*if (p3.x !== p1.x)
			return [ 0 ]; // Not on the same vertical line*/
		if(Math.abs(p3.x - p1.x) > tolerance)
			return [ 0 ]; /**/

	} else if (Math.abs(slope1 - slope2) > tolerance) {
		return [ 0 ]; // Not collinear
	}

	// Check if the point is within the bounding box of the segment
	const minX = Math.min(p1.x, p2.x) - tolerance2;
	const maxX = Math.max(p1.x, p2.x) + tolerance2;
	const minY = Math.min(p1.y, p2.y) - tolerance2;
	const maxY = Math.max(p1.y, p2.y) + tolerance2;
	const ret = [ (p3.x >= minX && p3.x <= maxX && p3.y >= minY && p3.y <= maxY) ];
	return ret;
}

function PinusLineIntersect(...args){
	const res = _PinusLineIntersect(...args)[0];
	if(res[3])
		return null;

	// The value that is supposed to indicate the
	// line does not intersect is not working,
	// but their values are always the same with first
	// and second argument. So check that instead.

	// I hope this does not spawn a bug.
	// - Mkay
	if(res[0] == args[0] && res[1] == args[1])
		return null;

	return res;
}

class PinusPointManager extends EventSystem {
	constructor(pinus){
		super();

		this.points = [];
		this.visible = [];
		this.pinus = pinus;
	}
}

PinusPointManager.prototype.push = function(point){
	const { points } = this;

	this.points.push(point);
}

PinusPointManager.prototype[Symbol.iterator] = function(){
	const points = [ ...this.points ];
	const _this = this;

	return {
		next: function next(){
			let point = points.shift();
			while(point && !point.isWithinView(_this.pinus))
				return next();

			return Boolean(point) ? {
				value: point,
				done: false
			} : {
				value: point,
				done: true
			}
		}
	}
}

class PinusPoint extends EventSystem {
	constructor(){
		super();

		this._x = 0;
		this._y = 0;
		this._radius = 0;
	}
}

PinusPoint.prototype.draw = function({ context }, counter){
	context.beginPath();
	context.arc(this.x, this.y, this._radius, 0, Math.PI * 2, 1);
	context.stroke();
}

PinusPoint.prototype.isWithinView = function(pinus){
	const { width, height } = pinus;
	const { x, y, radius } = this;
	/*if((x + width) < (this.x + (radius/2))){
		return false;
	}
	if(x > (this.x - (radius/2))){
		return false;
	}
	if((y + height) < (this.y + (radius/2))){
		return false;
	}
	if(y > (this.y - (radius/2))){
		return false;
	}*/

	//console.log([ x, y, radius ]);

	if(pinus.contains(x - radius, y - radius))
		return true;

	if(pinus.contains(x + radius, y + radius))
		return true;

	if(pinus.contains(x + radius, y - radius))
		return true;

	if(pinus.contains(x - radius, y + radius))
		return true;

	return false;
}

Object.defineProperties(PinusPoint.prototype, {
	x: {
		get(){
			return this._x;
		},

		set(x){
			this.emit("move", this._x, this._y, x, this._y);

			return this._x = x;
		}
	},
	y: {
		get(){
			return this._y;
		},

		set(y){
			this.emit("move", this._x, this._y, this._x, y);

			return this._y = y;
		}
	},
	radius: {
		get(){
			return this._radius;
		},

		set(r){
			this.emit("resize", this._radius, r);

			return this._radius = r;
		}
	}
});

class PinusRect extends PinusPoint {
	constructor(x, y, w, h){
		super();

		this.x = x || 0;
		this.y = y || 0;

		this.width = w || 50;
		this.height = h || 50;
	}
}

Object.defineProperties(PinusRect.prototype, {
	top: {
		get(){
			return this.y - this.height/2;
		},

		set(top){
			return this.y = top + this.height/2;
		}
	},
	left: {
		get(){
			return this.x - this.width/2;
		},

		set(left){
			return this.x = left + this.width/2;
		}
	},
	bottom: {
		get(){
			return this.y + this.height/2;
		},

		set(bottom){
			return this.y = bottom - this.height/2;
		}
	},
	right: {
		get(){
			return this.x + this.width/2;
		},

		set(right){
			return this.x = right - this.width/2;
		}
	}
});


PinusRect.prototype.contains = function(x, y){
	if(x < this.left)
		return false;

	if(x > this.right)
		return false;

	if(y < this.top)
		return false;

	if(y > this.bottom)
		return false;

	return true;
}

class Pinus extends PinusRect {
	constructor(canvas){
		super();

		this.pinus = this;
		this.points = new PinusPointManager(this);
		this.counter = 0;

		if(typeof canvas == "string")
			canvas = document.querySelector(canvas);

		this.canvas = canvas;
		this.context = canvas.getContext("2d");

		this._width = canvas.width;
		this._height = canvas.height;

		this.x = 0;
		this.y = 0;

		this.init();
	}
}

Pinus.prototype.init = function(){
	this.canvas.width = window.innerWidth;
	this.canvas.height = window.innerWidth;

	this.width = this.canvas.width;
	this.height = this.canvas.height;

	this.left = 0;
}

Pinus.prototype.draw = function(){
	const { context } = this;

	this.emit("draw");

	this.context.clearRect(0, 0, this.width, this.height);
	for(const point of this.points){
		//alert(JSON.stringify(point));
		point.draw(this, this.counter);
	}

	this.context.fillRect(this.right - 1, 0, 1, this.height);
}

Pinus.prototype.next = function(){
	this.counter++;
	this.emit("next");
}

Object.defineProperties(Pinus.prototype, {
	width: {
		get(){
			return this._width;
		},

		set(w){
			this.emit("resize", this._width, this._height,
				w, this._height
			);
			this._width = w;

			return w;
		}
	},

	height: {
		get(){
			return this._height;
		},

		set(h){
			this.emit("resize", this._width, this._height,
				this._width, h
			);
			this._height = h;

			return h;
		}
	}
});

