let Defensk = null;
let defensk = null;

DEFENSK().then(async function(instance){
	Defensk = instance;
	defensk = Object.fromEntries([
		[ "create_spline", "number", "number", "number" ],
		[ "spline_free", null, "number" ],
		[ "spline_at", null, "number", "number", "number", "number" ],
		[ "malloc", "number", "number" ],
		[ "free", null, "number" ]
	].map(function([ name, ret, ...args ]){
		return [ name, Defensk.cwrap(name, ret, args) ]
	}));

	main();
});

let scaleX = Math.max(
	Math.min((window.innerWidth/480), (window.innerHeight/720)), 1
);
let scaleY = scaleX;
let maxY = window.innerHeight/scaleX;
let maxX = window.innerWidth/scaleY;

function render(){
	scaleX = Math.max(
		Math.min((window.innerWidth/480), (window.innerHeight/720)), 1
	);
	scaleY = scaleX;
	maxY = window.innerHeight/scaleX;
	maxX = window.innerWidth/scaleY;

	const canvas = document.querySelector("canvas.main");
	canvas.width = window.innerWidth/scaleX;
	canvas.height = window.innerHeight/scaleY;
	canvas.style.width = window.innerWidth;
	canvas.style.height = window.innerHeight;


	const canvas2 = document.querySelector(".city-canvas");
	canvas2.width = window.innerWidth*5;
	canvas2.height = window.innerHeight*5;
	canvas2.style.width = window.innerWidth;
	canvas2.style.height = window.innerHeight;

	const context = canvas.getContext("2d");
	const context2 = canvas2.getContext("2d");
	return {
		canvas,
		context,
		canvas2,
		context2
	}
}

class Spline {
	constructor(coords){
		coords = new Float64Array(coords);
		const n = coords.length * coords.BYTES_PER_ELEMENT;
		this.cptr = defensk.malloc(n);
		Defensk.HEAPF64.set(coords, this.cptr >> 3);

		this.spline = defensk.create_spline(
			this.cptr,
			coords.length
		);
	}
}

Spline.prototype.at = function(pos){
	const xPtr = defensk.malloc(8);
	const yPtr = defensk.malloc(8);

	defensk.spline_at(this.spline, pos, xPtr, yPtr);

	const x = Defensk.HEAPF64[xPtr >> 3];
	const y = Defensk.HEAPF64[yPtr >> 3];

	defensk.free(xPtr);
	defensk.free(yPtr);

	return [ x, y ];
}

Spline.prototype.destroy = function(){
	defensk.free(this.cptr);
	defensk.spline_free(this.spline);
}

class Game extends EventSystem {
	constructor(){
		super();
		const _this = this;
		requestAnimationFrame(function f(){
			_this.emit("frame");

			requestAnimationFrame(f);
		});

		window.addEventListener("resize", function f(){
			if(window.readyState == "loading"){
				return window.addEventListener(
					"DOMContentLoaded",
					f
				);
			}

			Object.assign(this, render());

			_this.emit("resize");
		});

		this.explosions = [];
		this.missiles = [];
		this.bombs = [];
		this.buildings = [];
	}
}

Game.prototype.launchMissile = function(...param){
	const game = this;
	const missile = new Missile(
		Math.random()*maxX, maxY,
		...param
	);
	missile.destroy = function(){
		this.spline.destroy();
		this.emit("destroy");
		game.missiles.splice(game.missiles.indexOf(this), 1);
	}
	this.missiles.push(missile);
	this.emit("launch", missile);

	return missile;
}

Game.prototype.dropBomb = function(x, speed){
	if(x < 0){
		x = Math.random()*maxX;
	}

	const game = this;
	const bomb = new Bomb(
		x, speed
	);

	bomb.destroy = function(){
		this.emit("destroy");
		game.bombs.splice(game.bombs.indexOf(this), 1);

		//alert([ this.y, maxY * (95/100)]); 
		if(this.y > (maxY * (95/100))){
			const list = document.body.classList;
			if(list.contains("quake-1")){
				list.remove("quake-1");
				list.add("quake-2");

				return ;
			}

			list.remove("quake-2");
			list.add("quake-1");
		}
	}
	this.bombs.push(bomb);
	this.emit("drop", bomb);

	return bomb;
}

class Explosion {
	constructor(x, y, r){
		this.progress = 0;
		this.x = x;
		this.y = y;
		this.r = r;
	}
}

Explosion.prototype.draw = function(game, phase){
	this.progress = Math.min(this.progress, 100);
	if(this.progress == 100)
		return this.destroy && this.destroy();

	game.context.beginPath();
	game.context.arc(this.x, this.y,
		this.r * this.progress/100, 0, Math.PI * 2
	);
	game.context.fill();
	game.context.stroke();
}

class Missile extends EventSystem {
	constructor(startX, startY, destX, destY){
		super();

		this.destX = destX;
		this.destY = destY;
		this.points = [];
		this.coords = [
			startX, startY,
			startX, startY,
			((destX - 100) + (Math.random()*200)),
			((destY - 50) + (Math.random()*200)),
			destX, destY
		];
		this.spline = new Spline(this.coords);
		this.progress = 0;
	}
}

Missile.prototype.drawPoints = function(game, phase){
	const { context } = game;
	const points = this.points.slice(-5).reverse()
		.map((p, i, a) => [ p[0], p[1], a[i + 1] ]);
	context.beginPath();
	const head = points[0] || [];
	if(phase == 2){
		for(const [ x, y, d ] of points){
			context.moveTo(x, y);
			if(!d)
				continue ;

			context.lineWidth = 1;
			context.lineTo(d[0], d[1]);
			//console.log(x, y);
		}
	} else {
		context.fillRect(head[0] - 0.5, head[1] - 0.5, 2, 2);
	}

	context.stroke();
}

Missile.prototype.draw = function(game, phase){
	if(phase == 2){
		return this.drawPoints(game, phase);
	}
	const { destX, destY, progress } = this;

	this.progress = Math.min(progress, 100);
	if(this.progress == 100){
		this.destroy && this.destroy();
		this.drawPoints(game, phase);
		this.explode(game);
		return ;
	}

	this.points.push(this.spline.at((this.progress)/100));
	this.drawPoints(game);
}

Missile.prototype.explode = function(game){
	const radius = 50;
	const entry = this.points[this.points.length]
		|| [ this.destX, this.destY ]
	;
	const [ x, y ] = entry;
	//game.context.arc(x, y, radius, 0, 2 * Math.PI);
	//game.context.stroke();

	const explosion = new Explosion(x, y, radius);
	game.explosions.push(explosion);
	explosion.destroy = function(){
		game.explosions.splice(game.explosions.indexOf(explosion), 1);
	}

	let destroys = [];
	for(const bomb of game.bombs){
		if(bomb.x < (x - radius))
			continue ;

		if(bomb.x > (x + radius))
			continue ;

		if(bomb.y > (y + radius))
			continue ;

		if(bomb.y < (y - radius))
			continue ;

		//game.bombs.splice(game.bombs.indexOf(bomb), 1);
		destroys.push(bomb);
	}

	for(const bomb of destroys){
		bomb.destroy && bomb.destroy();
	}
}

class Bomb extends EventSystem {
	constructor(x, speed){
		super();
		if(x < 0)
			x = Math.random()*maxX;

		this.progress = 0;
		this.speed = (speed || (1 + Math.random()))/20;
		this.x = x;
	}
}

Object.defineProperties(Bomb.prototype, {
	y: {
		get(){
			return (this.progress/100)*maxY;
		}
	}
})

Bomb.prototype.draw = function(game, phase){
	this.progress = Math.min(this.progress, 100);
	const y = (this.progress/100)*maxY;

	if(this.progress >= 100)
		return this.destroy && this.destroy();

	if(phase == 2){
		game.context.fillRect(this.x, y - 10, 1, 9);

		return ;
	}

	if(phase == 3){
		game.context.fillRect(this.x, y - 33, 1, 33);

		return ;
	}

	game.context.fillRect(this.x - 1, y, 3, 3);
}

class Building {
	constructor(){
		this.width = 0;
		this.height = 0;
		this.occupies = [];
	}
}
/*
Building.getSlotFromXY = function(x, y){
	x = (~~(x/maxX * 10));
	y = (~~(y/maxY * 10));

	alert([ x, y ])
}*/

Building.getSlotFromPixelCoord = function(x, y){
	const [ slot ] = [ ...document.elementsFromPoint(x, y) ]
		.filter(e => e.classList.contains("slot"))
	;

	alert(slot.classList);
}

Building.getSlotFromXY = function(x, y){
	return document.querySelector(`.slot.x${x}.y${y}`);
}

Building.prototype.place = function(game, x, y){
	/*if(game.buildings.includes(this))
		throw new Error("Already placed");*/

	game.buildings[x + (y * 10)] = this;
	this.occupies.push([ x, y ]);
	this.pxWidth = window.innerWidth/10;
	this.pxHeight = this.pxWidth;
}

Building.prototype.draw = function(game){
	const context = game.context2;
	for(const [ x, y ] of this.occupies){
		const slot = Building.getSlotFromXY(x, y);
		/*if(slot){
			slot.style.backgroundColor = "red";
		}*/
		let { top, left, right, bottom } = slot
			.getBoundingClientRect()
		;

		/*
		top = (top/window.innerHeight) * maxY;
		left = (left/window.innerWidth) * maxX;
		bottom = (bottom/window.innerHeight) * maxY;
		right = (right/window.innerWidth) * maxX;*/

		/*game.context.fillRect(top, left, 30, 30);*/

		this.image && context.drawImage(this.image,
			left*5, top*5, right*5 - left*5, bottom*5 - top*5
		)
	}
}

const game = new Game();
let clientX = 30;
let clientY = 30;

let difficulty = 5;
let last = 0;
let last30 = 0;
let missiles = 0;
game.on("frame", function(){
	if(!this.context)
		return ;

	this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
	this.context2.clearRect(0, 0, this.canvas.width*5, this.canvas.height*5);
	this.context.globalAlpha = 1;
	this.context.save();
	for(const missile of this.missiles){
		missile.draw(this);
	}

	this.context.globalAlpha = 0.3;
	for(const missile of this.missiles){
		missile.draw(this, 2);
	}

	this.context.restore();
	this.context.globalAlpha = 0.05;
	for(const explosion of this.explosions){
		if(explosion.progress > 30)
			continue ;

		explosion.draw(this);
	}

	for(const explosion of this.explosions){
		if(explosion.progress > 50)
			continue ;

		explosion.draw(this);
	}

	for(const explosion of this.explosions){
		if(explosion.progress > 90)
			continue ;

		explosion.draw(this);
	}

	for(const explosion of this.explosions){
		explosion.draw(this);
	}

	this.context.restore();
	for(const bomb of this.bombs){
		this.context.globalAlpha = 0.05;
		bomb.draw(this, 3);
	}

	for(const bomb of this.bombs){
		this.context.globalAlpha = 0.2;
		bomb.draw(this, 2);
	}

	for(const bomb of this.bombs){
		this.context.globalAlpha = 1;
		bomb.draw(this);
	}

	this.context.restore();

	for(const build of this.buildings){
		if(build)
			build.draw(this);
	}

	const now = Date.now();
	if((last + (1000/12)) < now){
		game.emit("fps12");

		last = now;
	}

	if((last + (1000/30)) < now){
		game.emit("fps30");

		last30 = now;
	}

	this.context.restore();
});

game.on("fps30", function(){
	for(const missile of this.missiles){
		missile.progress += Math.max(
			(Math.max(missile.speed || 4, 1)
				* (missile.destY/maxY)), 1
		);
	}

	for(const bomb of this.bombs){
		bomb.progress += bomb.speed;
	}

	for(const explosion of this.explosions){
		explosion.progress +=
			((10 - Math.max(explosion.progress/100, 1)))/2;
	}
});


game.on("fps12", function(){
	for(const missile of this.missiles){

	}

	for(const bomb of this.bombs){

	}

	if((Math.random() * 500) > 495 - (difficulty * 5)){
		const bomb = game.dropBomb(-1, 8);
	}

	document.querySelector(".missile").textContent = missiles;
	this.context.save();
	this.context.globalAlpha = 0.2;
	this.context.fillRect(0, clientY, maxX, 1);
	this.context.fillRect(clientX, 0, 1, maxY);
	this.context.restore();
});

// AUTO DEFENSE SYSTEM //
class AbilityAutoDefense {
	constructor(game){
		const ability = this;

		this.counter = 0;
		this.level = 1;
		game.on("drop", function(bomb){
			if(ability.counter <= 0)
				return ;

			const missile = game.launchMissile(
				bomb.x,
				bomb.y + (bomb.speed * (800 * (maxY/800)))
			);

			missile.speed = 1;

			ability.counter--;
		});

		setInterval(this.inter = function inter(){
			ability.counter = ability.level * 2;
		}, 5000);
	}
}

// --------------------

async function main(){
	if(document.readyState == "loading"){
		return window.addEventListener("DOMContentLoaded", main);
	}

	Object.assign(game, render());
	new AbilityAutoDefense(game);

	let pos = 0;
	const { context } = render();

	window.addEventListener("click", function(click){
		if(!click.target.matches(".city, .city *"))
			return ;

		Building.getSlotFromPixelCoord(click.clientX, click.clientY);
	});

	window.addEventListener("click", function(click){
		if(click.target.matches(".base, .base *, .city, .city *"))
			return ;

		if(missiles <= 0)
			return ;

		clientX = (click.clientX/window.innerWidth) * maxX;
		clientY = (click.clientY/window.innerHeight) * maxY;

		const missile = game.launchMissile(clientX, clientY);
		missiles--;
	});

	function move(mouse){
		clientX = (mouse.clientX/window.innerWidth) * maxX;
		clientY = (mouse.clientY/window.innerHeight) * maxY;
	}

	window.addEventListener("mousemove", move);

	setInterval(function(){
		missiles = Math.min(missiles + 1, 20);
	}, 1000)

	const build = new Building();
	const image = build.image = new Image();
	image.src = URL.createObjectURL(await (await fetch("exp/command.png"))
		.blob()
	);

	build.place(game, 2, 9);
}

/*
	 $$$$$$\  $$$$$$$\  $$$$$$$$\ $$$$$$$\  $$$$$$\ $$$$$$$$\  $$$$$$\
	$$  __$$\ $$  __$$\ $$  _____|$$  __$$\ \_$$  _|\__$$  __|$$  __$$\
	$$ /  \__|$$ |  $$ |$$ |      $$ |  $$ |  $$ |     $$ |   $$ /  \__|
	$$ |      $$$$$$$  |$$$$$\    $$ |  $$ |  $$ |     $$ |   \$$$$$$\
	$$ |      $$  __$$< $$  __|   $$ |  $$ |  $$ |     $$ |    \____$$\
	$$ |  $$\ $$ |  $$ |$$ |      $$ |  $$ |  $$ |     $$ |   $$\   $$ |
	\$$$$$$  |$$ |  $$ |$$$$$$$$\ $$$$$$$  |$$$$$$\    $$ |   \$$$$$$  |
	 \______/ \__|  \__|\________|\_______/ \______|   \__|    \______/

	Text to ASCII generator: https://patorjk.com/software/taag

	All audio is taken from pixabay

	Nuke - freesounds123
	heavy missile launch - SingularitysMarauder
	distant explosion - SingularitysMarauder
	Missile Blast 2 - freesound_community
*/

let v = 0.5;
const alaunch = new Howl({
	src: [ "launch.mp3" ],
	autoplay: false,
	loop: false,
	volume: v
});
const aalarm = new Howl({
	src: [ "alarm.mp3" ],
	autoplay: false,
	loop: false,
	volume: v
});
const aquake = new Howl({
	src: [ "quake.mp3" ],
	autoplay: false,
	loop: false,
	volume: v
});
const aexplosion = new Howl({
	src: [ "explosion.wav" ],
	autoplay: false,
	loop: false,
	volume: v*2
});

game.on("launch", missile => {
	alaunch.play();
	missile.on("destroy", function(){
		aexplosion.play();
	});
});

game.on("drop", bomb => {
	bomb.on("destroy", function(){
		if(bomb.progress >= 90){
			aquake.play();
			aalarm.play();
		}
	});
});

