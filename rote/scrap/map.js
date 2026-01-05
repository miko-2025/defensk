const gpu = new GPU.GPU();
const DegreeRadiusXY = gpu.createKernel(function(degree, radius, x, y){
	return [
		x + radius * Math.cos(degree * Math.PI / 180),
		y + radius * Math.sin(degree * Math.PI / 180)
	];
}).setOutput([ 1 ]);
const XYDegree = gpu.createKernel(function(x, y){
	const theta = Math.atan2(y, x) * 180 / Math.PI;
	if(x < 0)
		theta = 180 + theta;
	return theta;
}).setOutput([ 1 ]);

const Distance = gpu.createKernel(function(x, y){
	if(x == 0 || y == 0)
		return 0;

	return Math.sqrt((x * x) + (y * y));
}).setOutput([ 1 ]);

let WithinRadius = gpu.createKernel(function(x, y, r){
	return (((x * x) + (y * y)) < (r * r)) ? 1 : 0;
}).setOutput([ 1 ]);


let _LineIntersect = gpu.createKernel(function(x1, y1, x2, y2, x3, y3, x4, y4){
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
/*
let _IsPointOnLineSegment = gpu.createKernel(function(x, y, x2, y2, x3, y3){
	// Got this from google search AI summary
	//	- Mkay

	// p: test point {x, y}
	// a: first endpoint of the line segment {x, y}
	// b: second endpoint of the line segment {x, y}

	// Check if slopes are equal (collinearity)
	const crossProduct = (y - y2) * (x3 - x2) - (x - x2) * (y3 - y2);
	if(Math.abs(crossProduct) > 0.1){
		return 0; // Not collinear
	}

	// Check if point is within the bounding box of the segment
	const minX = Math.min(x2, x3);
	const maxX = Math.max(x2, x3);
	const minY = Math.min(y2, y3);
	const maxY = Math.max(y2, y3);

	if(x >= minX && x <= maxX && y >= minY && y <= maxY){
		return 1;
	} else
		return 0;
}).setOutput([ 1 ]);

function IsPointOnLineSegment(x, y, x2, y2, x3, y3){
	// Got this from google search AI summary
	//	- Mkay

	// p: test point {x, y}
	// a: first endpoint of the line segment {x, y}
	// b: second endpoint of the line segment {x, y}

	//alert(Array.from(arguments));

	// Check if slopes are equal (collinearity)
	const crossProduct = (y - y2) * (x3 - x2) - (x - x2) * (y3 - y2);
	/*if(Math.abs(crossProduct) > 0.01){
		return [ 0 ]; // Not collinear
	}*//*

	// Check if point is within the bounding box of the segment
	const minX = Math.min(x2, x3);
	const maxX = Math.max(x2, x3);
	const minY = Math.min(y2, y3);
	const maxY = Math.max(y2, y3);

	if((x >= minX) && (x <= maxX) && (y >= minY) && (y <= maxY)){
		return [ 1 ];
	}

	return [ 0 ];
}*/

function IsPointOnLineSegment(x, y, x1, y1, x2, y2) {
	/*x = Math.round(x);
	y = Math.round(y);
	x1 = Math.round(x1);
	y1 = Math.round(y1);
	x2 = Math.round(x2);
	y2 = Math.round(y2);*/
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

	/*alert([
		x, y, ")",
		x1, y1,
		x2, y2, "/",
		minX, minY, maxX, maxY,
		(p3.x >= minX && p3.x <= maxX && p3.y >= minY && p3.y <= maxY)
	])*/


	const ret = [ (p3.x >= minX && p3.x <= maxX && p3.y >= minY && p3.y <= maxY) ];
	/*const { map } = game;
	const { context } = map;
	context.save();
	context.fillStyle = "cyan";
	if(ret[0] == false)
		context.fillStyle = "red";

	map.fillRect(minX, minY, 3, 3);
	map.fillRect(maxX, minY, 3, 3);
	map.fillRect(minX, maxY, 3, 3);
	map.fillRect(maxX, maxY, 3, 3);
	context.restore();*/

	return ret;
}

let LineIntersect = function(...args){
	const res = _LineIntersect(...args)[0];
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

class Map extends EventSystem {
	constructor(canvas, context){
		super();
		this.canvas = canvas;
		this.context = context || (canvas && canvas.getContext("2d"));

		this.x = 0;
		this.y = 0;
		this.data = [];
	}
}


Map.prototype.init = function(canvas){
	canvas = this.canvas || canvas;
	const min = window.innerWidth > window.innerHeight
		? window.innerHeight
		: window.innerWidth
	;
	canvas.width = min;
	canvas.height = min;

	canvas.style.width = `${canvas.width}px`;
	canvas.style.height = `${canvas.height}px`;

	const context = this.context = canvas.getContext("2d");
	this.canvas = canvas;
}

Map.prototype.shoot = function(sx, sy, tx, ty, points, cb){
	for(const point of points.filter(p => p instanceof MapBuild)){

	}
}

Map.prototype.getData = function(bind){
	return this.data.filter(entry => entry.bind === bind).pop();
}

Map.prototype.initData = function(){
	//alert(document.querySelectorAll(".panel-character > .character").length);

	/*for(const char of Array.from(document.querySelectorAll(
		".panel-character > .character"
	))){
		if(char.classList.contains("template"))
			continue ;

		this.initCharacter(char);
	}*/

	const point = new MapTouchPoint(this, this.canvas, 0, 0);
	this.data.push(point);
}

Map.prototype.closestPoint = function(x, y){
	return this.closestPoints(x, y).shift();
}

Map.prototype.closestPoints = function(x, y){
	return [...this.data]
		.sort(
			(l, r) =>
				Distance(l.x - x, l.y - y)[0] -
					Distance(r.x - x, r.y - y)[0]
		)
	;
}

Map.prototype.closestPointWithinRadius = function(x, y, r){
	return this.closestPointWithinRadius(x, y, r).shift();
}

Map.prototype.closestPointsWithinRadius = function(x, y, r){
	r = r;
	return [...this.data]
		.filter(point => Math.abs(point.x - x) < r)
		.filter(point => Math.abs(point.y - y) < r)
		.sort(
			(l, r) =>
				Distance(l.x - x, l.y - y)[0] -
					Distance(r.x - x, r.y - y)[0]
		)
	;
}

Map.prototype.translate = function(x, y){
	const tx = x - this.x;
	const ty = y - this.y;

	return [ tx, ty ];
}

Map.prototype.fillText = function(text, ox, oy){
	const [ x, y ] = this.translate(ox, oy);
	const { context } = this;
	return context.fillText(text, x, y);
}

Map.prototype.fillRect = function(ox, oy, w, h){
	const [ x, y ] = this.translate(ox, oy);
	const { context } = this;
	return context.fillRect(x, y, w, h);
}

Map.prototype.arc = function(ox, oy, radius, san, ean, ccl){
	const [ x, y ] = this.translate(ox, oy);
	const { context } = this;
	return context.arc(x, y, radius, san, ean, ccl);
}

Map.prototype.lineTo = function(ox, oy){
	const [ x, y ] = this.translate(ox, oy);
	const { context } = this;
	return context.lineTo(x, y);
}

Map.prototype.moveTo = function(ox, oy){
	const [ x, y ] = this.translate(ox, oy);
	const { context } = this;
	return context.moveTo(x, y);
}

Map.prototype.beginPath = function(ox, oy, w, h){
	return this.context.beginPath();
}

Map.prototype.stroke = function(){
	return this.context.stroke();
}

Map.prototype.save = function(){
	return this.context.save();
}

Map.prototype.draw = function(){
	const { data, canvas, context } = this;

	if(!canvas)
		return ;


	//const { context } = main.map;
	//const x = (Date.now() % 5000)/5000 * window.innerWidth;
	//const x = (i += 2) % window.innerWidth;
	//context.clearRect(0, 0, window.innerWidth, window.innerHeight);
	//context.fillRect(x, 0, 1, window.innerHeight); // */
	//main.map.fillText("Hello!", x % window.innerWidth, window.innerHeight/2);

	//alert(data.length);
	context.clearRect(0, 0, window.innerWidth, window.innerHeight);
	for(const point of data)
		point.draw();

	this.emit("draw");
	//context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
}

class MapPoint extends EventSystem {
	constructor(map, bind, x, y){
		super();

		this.map = map;
		this.bind = bind;
		this.x = x || 0;
		this.y = y || 0;
		this.connect = [];

		bind.isTurn = bind.isTurn || 0;
		bind.name = bind.name || "Unnamed";
		bind.type = bind.type || "Null";
		bind.dead = bind.dead || 0

		this.color = "lightGreen";
		this.radiusColor = "white";
		this.nameColor = "lightBlue";
		this.typeColor = "lightYellow";
		this.deadColor = "red";
	}
}

Object.defineProperties(MapPoint.prototype, {
	x: {
		get(){
			return this._x;
		},

		set(n){
			this.map.emit("move", this);

			return this._x = n;
		}
	},
	y: {
		get(){
			return this._y;
		},

		set(n){
			this.map.emit("move", this);

			return this._y = n;
		}
	}
});

MapPoint.prototype.crossing = function(tx, ty, build){
	const crossed = [];
	for(const inner of build.builds){
		let int = inner.intersect(this.x, this.y, tx, ty, 1)
			//.filter(Boolean)
		;

		/*const { map } = game
		const { context } = map;
		const [ itop, iright, ileft, ibottom ] = int;
		context.save();
		//context.lineTo(touchPoint.x, touchPoint.y);
		context.stroke();
		context.fillStyle = "cyan";
		ileft && map.fillRect(ileft[0] - 1, ileft[1] - 1, 3, 3);
		itop && map.fillRect(itop[0] - 1, itop[1] - 1, 3, 3);
		iright && map.fillRect(iright[0] - 1, iright[1] - 1, 3, 3);
		ibottom && map.fillRect(ibottom[0] - 1, ibottom[1] - 1, 3, 3);
		context.restore();
		//alert(int);*/
		int = int.filter(Boolean)
		if(!int[0]){
			continue ;
			//shoot.end = [ tx, ty, null ];
		}
		crossed.push([ inner, int ]);
	}

	const crossed2 = [];
	for(const [ cross, int ] of crossed){
		const [ distance ]
			= Distance(this.x - cross.x, this.y - cross.y)
		;

		crossed2.push([ distance, cross, int ]);
	}

	const closest = crossed2.sort((l, r) => l[0] - r[0]);
	return closest;
}

MapPoint.prototype.shoot = function(tx, ty, builds){
	let shoot = new MapShoot();
	let build = this.getBuild(builds);
	if(!build)
		return null;

	let entry;
	let [ dist, hit, int ] = this.crossing(tx, ty, build)[0] || [];
	if(hit){
		//alert(int.map(a => `${a[0]}|${a[1]}`).join(":"));
		int = int.map(([x, y]) => [
			x,
			y,
			Distance(x - this.x, y - this.y)[0]
		]).sort((l, r) => l[2] - r[2])[0];
		//alert(int.join(":"));

		entry = hit.entry(int[0], int[1])[0];
		if(entry)
			build = hit;
		else {
			shoot.end = [ int[0], int[1], null ];

			return shoot;
		}
	}

	int = build.intersect(this.x, this.y, tx, ty).filter(Boolean);
	if(!int[0]){
		shoot.end = [ tx, ty, null ];

		return shoot;
	}

	let [ x, y ] = int[0];
	entry = build.entry(x, y)[0];
	let fault = 1;
	let trace = [];
	while(fault++){
		if(fault > 20){
			// sometimes this breaks into infinite loop idk why
			// so I check if the line goes through 100 rooms
			// and terminate it if so because that does not
			// really makes sense to me
			// - Mkay

			// Update 1
			// I suspect this also relates to the bug preventing
			// a point from going upward through an entry. Might
			// be a clue hmm.

			// Update 2
			// Fixed the bug on Update 1, but idk bout the infi-
			// loop still

			//alert(`MapPoint.prototype.shoot: Fault detected`);
			return shoot;
		}
		shoot.end = [ x, y, entry ];

		if(!entry)
			break ;

		entry = entry.connect[0];
		if(!entry)
			break ;

		build = entry.build;
		//document.querySelector(".deb").textContent = String(build);
		if(!build)
			break ;

		let [ dist, hit, int ] = this.crossing(tx, ty, build)[0] || [];
		if(hit){
			int = int.map(([x, y]) => [
				x,
				y,
				Distance(x - this.x, y - this.y)[0]
			]).sort((l, r) => l[2] - r[2])[0];

			entry = hit.entry(int[0], [1]);
			if(entry[0])
				build = hit;
			else {
				shoot.end = [ int[0], int[1], null ];

				return shoot;
			}
		}

		int = build.intersect(x, y, tx, ty).filter(Boolean);
		if(!int[0]){
			shoot.end = [ tx, ty, null ];

			break ;
		}

		x = int[0][0];
		y = int[0][1];

		entry = build.entry(x, y)[0];

		if(!entry){
			shoot.end = [ x, y, null ];

			break ;
		}

		const { map } = game;
		const { context } = map;
		/*context.save();
		//context.lineTo(touchPoint.x, touchPoint.y);
		context.stroke();
		context.fillStyle = "cyan";
		map.fillRect(x, y, 2, 2);
		context.restore();*/



		//trace.push(entry.connect[0].name);
	}

	//document.querySelector(".deb").textContent = trace.join("\n");
	return shoot;
}

MapPoint.prototype.getBuild = function(builds){
	if(this.build)
		return this.build;

	if(!builds)
		return null;

	const t = -1;
	for(const build of builds){
		if(!(build instanceof MapBuild))
			continue ;

		if(build.entry(this.x - 1, this.y)[0])
			return build;

		if(build.entry(this.x, this.y - 1)[0])
			return build;

		if(build.entry(this.x, this.y + 1)[0])
			return build;

		if(build.entry(this.x + 1, this.y)[0])
			return build;

		if(build.entry(this.x, this.y)[0])
			return build;

		if(this.x < build.left - t)
			continue ;

		if(this.x > build.right + t)
			continue ;

		if(this.y < build.top - t)
			continue ;

		if(this.y > build.bottom + t)
			continue ;

		return build;
	}

	return null;
}

MapPoint.prototype.summon = function(target){
	target.x = this.x;
	target.y = this.y;
}

MapPoint.prototype.teleport = function(target){
	this.x = target.x;
	this.y = target.y;
}

MapPoint.prototype.push = function(){
	return this.map.data.push(this);
}

MapPoint.prototype.splice = function(){
	const index = this.map.data.indexOf(this);
	if(index > 0)
		this.map.data.splice(index, 1);
	return index;
}

MapPoint.prototype.draw = function(){
	const { map, bind } = this;
	//const { context } = map;

	const [ tx, ty ] = map.translate(this.x, this.y);

	map.fillRect(tx - 1, ty - 1, 3, 3);
	let radius = bind.radius || 10;
	let name = bind.name;
	let type = bind.type || "Null";
	let dead = bind.dead;

	let color = this.color;
	let radiusColor = this.radiusColor;
	let healthColor = this.healthColor;
	let nameColor = this.nameColor;
	let typeColor = this.typeColor;
	let deadColor = this.deadColor;
	let scene = this.scene;
	map.context.save();
	if(radius){
		map.beginPath();
		map.context.strokeStyle = radiusColor;
		map.arc(this.x, this.y, radius, 0, 360);
		map.context.strokeStyle = healthColor;
		this.drawHealth(radius);
		map.stroke();
		map.context.fillStyle = nameColor;

		if(!name)
			map.context.fillStyle = typeColor

		name = name || type;
		if(dead){
			if(dead >= 1){
				map.context.fillStyle = deadColor;
			}
		}

		map.fillText(name, this.x, this.y);
	}

	if(this.bind.isTurn){
		if((Date.now() % 2000) > 1000){
			map.fillRect(this.x, 0, 1, map.canvas.height);
			map.fillRect(0, this.y, map.canvas.width, 1);
		}
	}

	for(let connect of this.connect){
		if(connect.point)
			connect = connect.point;

		map.beginPath();
		map.moveTo(this.x, this.y);
		map.context.setLineDash([ 5, 5 ]);
		map.lineTo(connect.x, connect.y);
		map.stroke();
	}

	if(scene){
		scene.x = tx;
		scene.y = ty;
		scene.tick();
	}

	map.context.restore();
}

MapPoint.prototype.drawHealth = function(radius){

}

class MapShoot {
	constructor(){
		this.end = null;
	}
}

class MapTouchPoint extends MapPoint {
	constructor(map, bind, x, y){
		super(map, bind, x, y);
	}
}

MapTouchPoint.prototype.draw = function(){
	const { map } = this;
	const { context } = map;

	const [ tx, ty ] = map.translate(this.x, this.y);
	//document.querySelector(".deb").textContent = String([ this.x, this.y ]);
	//const [ tx, ty ] = [ this.x, this.y ];
	const closest = map.closestPointsWithinRadius(this.x, this.y, 100)[1];
	context.save();

	map.beginPath();
	map.context.globalAlpha = 0.15;
	map.arc(this.x, this.y, 100, 0, 360);
	map.context.setLineDash([ 5, 5 ]);
	map.context.strokeStyle = "white";
	map.stroke();
	map.context.setLineDash([ ]);

	this.closest = closest;
	if(!closest)
		return context.restore();

	const [ ctx, cty ] = map.translate(closest.x, closest.y);
	//alert(map.data.length);
	//context.fillStyle = "#FFFFFF";
	//map.fillRect(this.x - 1, this.y - 1, 3, 3);
	map.context.globalAlpha = 1;
	map.beginPath();
	map.moveTo(this.x, this.y);
	map.context.lineWidth = 1;
	map.lineTo(closest.x, closest.y);
	map.context.strokeStyle = "lightBlue";
	map.stroke();
	context.restore();
}

class MapBuild extends MapPoint {
	constructor(map, bind, x, y, width, height){
		super(map, bind, x, y);

		this.width = width || 50;
		this.height = height || 50;
		this.borderColor = "white";
		this.entries = [];
		this.builds = [];
	}
}

Object.defineProperties(MapBuild.prototype, {
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

MapBuild.prototype.draw = function(){
	const { map } = this;
	const { context } = map;

	const [ tx, ty ] = map.translate(this.x, this.y);

	let borderColor = this.borderColor
	let scene = this.scene;

	context.save();
	context.strokeStyle = borderColor;
	context.strokeRect(
		tx - this.width/2,
		ty - this.height/2,
		this.width,
		this.height
	);
	for(const entry of this.entries){
		context.beginPath();
		context.strokeStyle = "#343434";
		context.globalOpacity = 1;
		context.lineWidth = 3;
		map.moveTo(entry.x1, entry.y1);
		map.lineTo(entry.x2, entry.y2);
		context.stroke();
		/*context.beginPath();
		context.strokeStyle = "cyan";
		map.moveTo(entry.x1, entry.y1);
		map.lineTo(this.x, this.y);
		context.stroke();*/
	}

	context.restore();
	if(scene){
		scene.x = tx;
		scene.y = ty;
		scene.tick({});
	}
}

MapBuild.prototype.drawName = function(){
	const { map } = this;
	const { context } = map;
	const [ tx, ty ] = map.translate(this.x, this.y);

	let nameColor = this.nameColor;
	let typeColor = this.typeColor;

	const name = this.bind.name;
	const type = this.bind.type;
	const health = this.bind.health;

	context.save()
	context.fillStyle = nameColor;
	name && map.fillText(name, this.x, this.y);
	context.fillStyle = typeColor;
	type && map.fillText(type, this.x, this.y + 12);
	context.restore();
}

MapBuild.prototype.contains = function(x, y){
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

MapBuild.prototype.intersect = function(sx, sy, ex, ey, isInner){
	const { top, right, bottom, left } = this;
	//alert([top, right, bottom, left]);

	/*let x1;
	let y1;
	let x2;
	let y2;
	let x3;
	let y3;
	let x4;
	let y4;*/

	let tx;
	let ty;
	if(isInner
		&& (((sx < left) || (sx > right))
			|| ((sy < top) || (sy > bottom))
		)
	){
		/*tx = sx;
		ty = sy;
		sx = ex;
		sy = ey;
		ex = tx;
		ey = ty;*/

		/*const itop
			= LineIntersect(
				left, top, right, top, sx, sy, ex, ey
			)
		;
		const iright
			= LineIntersect(
				right, top, right, bottom, sx, sy, ex, ey
			)
		;
		const ibottom
			= LineIntersect(
				right, bottom, left, bottom, sx, sy, ex, ey
			)
		;
		const ileft
			= LineIntersect(
				left, bottom, left, top, sx, sy, ex, ey
			)
		;*/


		/*const itop
			= LineIntersect(ex, ey, sx, sy, left, top, right, top);*/

		let ibottom
			//= LineIntersect(ex, ey, sx, sy, left, top, right, top);
			= LineIntersect(ex, ey, sx, sy, left, top, right, top);
		let ileft
			= LineIntersect(ex, ey, sx, sy, right, top, right, bottom);
		let itop
			= LineIntersect(ex, ey, sx, sy, right, bottom, left, bottom);
		let iright
			= LineIntersect(ex, ey, sx, sy, left, bottom, left, top);

		/*let temp = ibottom;
		ibottom = itop;
		itop = temp;

		temp = ileft;
		ileft = iright;
		iright = temp;*/


		/*document.querySelector(".deb").textContent = [
			'{' + [ sx, sy, ex, ey, left, top, right, bottom ].join(', ') + '}',
			[ itop, iright, ibottom, ileft ]
				.map(e => e ? `[${e[0]}, ${e[1]}] ` : `(x)`)
				.join('')
		].join('\n\n');*/

		const { map } = game
		const { context } = map;
		context.save();
		//context.lineTo(touchPoint.x, touchPoint.y);
		context.stroke();
		context.fillStyle = "cyan";
		ileft && map.fillRect(ileft[0] - 1, ileft[1] - 1, 3, 3);
		itop && map.fillRect(itop[0] - 1, itop[1] - 1, 3, 3);
		iright && map.fillRect(iright[0] - 1, iright[1] - 1, 3, 3);
		ibottom && map.fillRect(ibottom[0] - 1, ibottom[1] - 1, 3, 3);
		context.restore();

		if(sx < ileft)
			return [ ileft, itop, iright, ibottom];

		if(sy < itop)
			return [ itop, ileft, ibottom, iright];

		if(sy > ibottom)
			return [ ibottom, ileft, itop, iright];

		if(sy > iright)
			return [ ibottom, iright, itop, ileft];
		//return [ ibottom, ileft, itop, iright ]
		return [ itop, iright, ibottom, ileft ];
	}

	const itop
		= LineIntersect(sx, sy, ex, ey, left, top, right, top);
	const iright
		= LineIntersect(sx, sy, ex, ey, right, top, right, bottom);
	const ibottom
		= LineIntersect(sx, sy, ex, ey, right, bottom, left, bottom);
	const ileft
		= LineIntersect(sx, sy, ex, ey, left, bottom, left, top);

	/*document.querySelector(".deb").textContent =
		[ itop, iright, ibottom, ileft ]
			.map(e => e ? `[${e[0]}, ${e[1]}] ` : `(x)`)
			.join('')*/

	if(sx < ileft)
		return [ ileft, itop, iright, ibottom];

	if(sy < itop)
		return [ itop, ileft, ibotom, iright];

	//alert([itop, iright, ibottom, ileft].join("|"));
	return [ itop, iright, ibottom, ileft ];
}

MapBuild.prototype.addEntry = function(side, x, x2, connect){
	const entry = new MapBuildEntry(this, connect);
	if(side == 0){
		entry.x1 = this.left + x;
		entry.x2 = this.right - x2;
		entry.y1 = this.top;
		entry.y2 = this.top;
	}
	else if(side == 1){
		entry.x1 = this.right;
		entry.x2 = this.right;
		entry.y1 = this.top + x;
		entry.y2 = this.bottom - x2;
	}
	else if(side == 2){
		entry.x1 = this.right - x;
		entry.x2 = this.left + x2;
		entry.y1 = this.bottom;
		entry.y2 = this.bottom;
	}
	else if(side == 3){
		entry.x1 = this.left;
		entry.x2 = this.left;
		entry.y1 = this.bottom - x;
		entry.y2 = this.top + x2;
	}
	else return null;

	this.entries.push(entry);

	return entry;
}

MapBuild.prototype.removeEntry = function(){

}

MapBuild.prototype.entry = function(x, y){
	return this.entries.filter(entry => {
		const ret = IsPointOnLineSegment(
			entry.x1, entry.y1,
			entry.x2, entry.y2,
			x, y
		)[0];
		const { context } = game.map;
		context.save();
		context.strokeStyle = "green";
		/*context.beginPath();
		context.moveTo(150, 150)
		context.lineTo(touchPoint.x, touchPoint.y);
		context.stroke();*/
		/*context.fillStyle = "white";
		context.fillRect(x - 1, y - 1, 3, 3);*/
		context.restore();

		//setTimeout(() => alert(ret), 1000);

		return Boolean(ret);
	});

	return this.entries.filter(entry =>
		IsPointOnLineSegment(
			x, y,
			entry.x1, entry.y1,
			entry.x2, entry.y2
		)[0]
	);
}

class MapBuildEntry extends EventSystem {
	constructor(build, connect){
		super();

		this.build = build;
		this.connect = [];

		if(connect){
			if(connect.connect.indexOf(this) < 0)
				connect.connect.push(this);

			if(this.connect.indexOf(connect) < 0)
				this.connect.push(connect);
		}
	}
}

window.addEventListener("load", async function(){
	await game.once("map-add");
	let clcool = 0;
	game.on("click", function(){
		if(clcool + 500 > Date.now())
			return ;

		clcool = Date.now();
		const { character, touchPoint, map } = game;
		const { context } = map;

		if(!character)
			return ;

		const shoot = character.point.shoot(
			touchPoint.x,
			touchPoint.y,
			map.data
		);

		//alert(shoot.end);

		if(!shoot || !shoot.end)
			return ;

		const [ x, y, entry ] = shoot.end;
		game.cx = x;
		game.cy = y;

		let [ deg ] = XYDegree(
			game.cx - character.point.x,
			game.cy - character.point.y
		);
		game.deg = deg;

		const [ dx, dy ]
			= DegreeRadiusXY(deg, 0.1,
				character.point.x,
				character.point.y
			)[0]
		;

		game.ax = dx - character.point.x;
		game.ay = dy - character.point.y;
		if(game.ay == 0)
			game.ay = game.ax;
	});

	game.map.on("draw", function(){
		const { character, touchPoint, map, cx, cy } = game;
		const { context } = map;
		if(!cx || !cy)
			return ;

		const [ tx, ty ] = map.translate(
			character.point.x,
			character.point.y
		);

		const [ ctx, cty ] = map.translate(cx, cy);

		context.save();
		context.strokeStyle = "green";
		context.beginPath();
		context.moveTo(tx, ty)
		context.lineTo(ctx, cty);
		//context.lineTo(touchPoint.x, touchPoint.y);
		context.stroke();
		context.fillStyle = "red";
		context.fillRect(ctx - 1, cty - 1, 3, 3);
		context.restore();
	});

	let fps = 0;
	let last = 0;
	/*flicker(function(){
		const c = game.character
		if(!c)
			return ;

		if(!game.cx)
			return ;

		const cpoint = game.character.point;
		const [ deg ] = XYDegree(
			game.cx - cpoint.x,
			game.cy - cpoint.y
		);

		document.querySelector(".deb").textContent = [ game.ax, game.ay, game.deg ];

		const [ x, y ] = [ cpoint.x, cpoint.y ];

		c.x += game.ax;
		c.y += game.ay;

		if(Math.abs(game.cx - cpoint.x) > Math.abs(game.cx - x))
			c.x = game.cx;

		if(Math.abs(game.cy - cpoint.y) > Math.abs(game.cy - y))
			c.y = game.cy;

		fps++;
		if(last + 1000 < Date.now()){
			//document.querySelector(".deb").textContent = fps;
			last = Date.now();
			fps = 0;
		}
	}, 60);*/
});

window.addEventListener("load", async function(){
	return ; //disabled. debug only
	const { context } = game.map;
	const chapter = game.chapters["berlin-prologue"];

	game.map.on("draw", function(){
		if(!chapter.entry1)
			return ;

		const { touchPoint } = game;
		const int = chapter.entry1.intersect(150, 150,
			touchPoint.x, touchPoint.y);
		if(!int.filter(Boolean).length)
			return ;
		const [ x, y ] = int.filter(Boolean)[0];
		/*const [ x, y ] = chapter.entry1.intersect(150, 150,
			50, 300);*/
		context.save();
		context.strokeStyle = "green";
		context.beginPath();
		context.moveTo(150, 150)
		context.lineTo(touchPoint.x, touchPoint.y);
		context.stroke();
		context.fillStyle = "red";
		context.fillRect(x - 1, y - 1, 3, 3);
		context.restore();

		let entry = chapter.entry1.entry(x, y)[0];
		if(entry){
			entry = entry.connect[0];
			//entry = chapter.entry1.entries[0].connect[0];
			const int = entry.build.intersect(150, 150,
				touchPoint.x, touchPoint.y);
			if(!int.filter(Boolean).length) return ;
			const [ x2, y2 ] = int.filter(Boolean)[0];

			context.save();
			context.fillStyle = "red";
			context.fillRect(x2 - 1, y2 - 1, 3, 3);
			context.restore();
		}
	});
})
/*
const DegreeRadiusXY = gpu.createKernel(function(degree, radius, x, y){
	return [
		x + radius * Math.cos(degree * Math.PI / 180),
		y + radius * Math.sin(degree * Math.PI / 180)
	];
}).setOutput([ 1 ]);
const XYDegree = gpu.createKernel(function(x, y){
	const theta = Math.atan2(y, x) * 180 / Math.PI;
	if(x < 0)
		theta = 180 + theta;;
	return theta;
}).setOutput([ 1 ]);*/

/*qevent("click", ".go", function(ev){
	const c = game.character
	const cpoint = game.character.point;
	const [ deg ] = XYDegree(game.cx - cpoint.x, game.cy - cpoint.y);
	const [ x, y ] = DegreeRadiusXY(deg, 1, cpoint.x, cpoint.y)[0];
	c.x = x;
	c.y = y;
});*/