const VERSION = "0.0.3";
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
	if(!canvas)
		return {};
	canvas.width = window.innerWidth/scaleX;
	canvas.height = window.innerHeight/scaleY;
	canvas.style.width = window.innerWidth;
	canvas.style.height = window.innerHeight;


	const canvas2 = document.querySelector(".city-canvas");
	if(!canvas2)
		return {};

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

		if(document.readyState == "loading")
			window.addEventListener("DOMContentLoaded", function(){
				_this.onDCL();
			})
		else {
			_this.onDCL();
		}

		this.explosions = [];
		this.missiles = [];
		this.bombs = [];
		this.buildings = [];
		this.trade = [];

		this.balance = 300;
		this.ammo = 0;
		this.started = 0;
	}
}

Game.prototype.onDCL = function(){
	this.dom = Object.fromEntries([
		[ "missile", ".status .missile" ]
	].map(e => [ e[0], document.querySelector(`${e[1]}`) ]))

	this.dom.missile.textContent = this.ammo;
}

Game.prototype.getBuildFromXY = function(x, y){
	x = Number(x);
	y = Number(y);
	return this.buildings[x + (y * 10)];
}

Game.prototype.deleteBuildFromXY = function(x, y){
	x = Number(x);
	y = Number(y);

	const build = this.getBuildFromXY(x, y);
	if(build.deleting)
		return ;

	build.deleting = 1;
	let res;
	const ret = new Promise(function(rs, rej){
		res = rs;
	});

	build.emit("delete", function(){ res(); });
	this.buildings[x + (y * 10)] = null;

	return ret;
}

Game.prototype.deleteBuild = function(build){
	this.buildings[this.buildings.indexOf(build)] = null;
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

Object.defineProperties(Game.prototype, {
	balance: {
		get(){
			return this._balance || 0;
		},

		set(x){
			this._balance = x;
			const display = document.querySelector(".balance");
			if(display)
				display.textContent = `${x}`;
		}
	}
});

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

class Building extends EventSystem {
	constructor(){
		super();

		this.width = 0;
		this.height = 0;
		this.occupies = [];

		this.on("second", Building.onSecond);
	}
}

Building.onSecond = function(){
	let relative = this.getRelative(game, 0, -1);
	if(this.hit && relative && !(relative instanceof SelectorBuilding)){
		if(this.images && this.images.includes(Building.scaffold))
			return ;
		if(this.images)
			this.images.push(Building.scaffold)
		else
			this.images = [ Building.scaffold ];
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

	return slot;
}

Building.getXYFromSlot = function(slot){
	const attr = slot.classList.toString().split(' ');
	const x = attr.find(x => x.startsWith('x')).slice(1);
	const y = attr.find(y => y.startsWith('y')).slice(1);

	return [ x, y ];
}

Building.getSlotFromXY = function(x, y){
	return document.querySelector(`.slot.x${x}.y${y}`);
}

Building.rooftop = function(game, x, y){
	y = 9;
	while(game.getBuildFromXY(x, y)) y--;

	return y;
}

Building.rooftopBuild = function(game, x, y){
	return game.getBuildFromXY(x, Building.rooftop(x, y));
}

Building.prototype.place = function(game, x, y){
	/*if(game.buildings.includes(this))
		throw new Error("Already placed");*/

	x = Number(x);
	y = Number(y);

	game.buildings[x + (y * 10)] = this;
	this.occupies.push([ x, y ]);
	this.pxWidth = window.innerWidth/10;
	this.pxHeight = this.pxWidth;
}

Building.prototype.getXY = function(game){
	const index = game.buildings.indexOf(this);
	return [ index % 10, ~~(index / 10) ];
}

Building.prototype.getRelative = function(game, rx, ry){
	const [ x, y ] = this.getXY(game);
	return game.getBuildFromXY(x + rx, y + ry) || null;
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

		if(this.images){
			for(const image of this.images){
				context.drawImage(image,
					left*5, top*5, right*5 - left*5,
					bottom*5 - top*5
				);
			}
		}
	}
}

class Trade extends EventSystem  {
	constructor(cost){
		super();

		this.cost = cost;
	}
}

const game = new Game();
let clientX = 30;
let clientY = 30;

let difficulty = 5;
let last = 0;
let last30 = 0;
game.on("frame", function(){
	if(!this.context)
		return ;

	this.context2.clearRect(0, 0, this.canvas.width*5, this.canvas.height*5);
	for(const build of this.buildings){
		if(build)
			build.draw(this);
	}

	this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
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
		if(game.started){
			const bomb = game.dropBomb(-1, 8);
		}
	}

	document.querySelector(".missile").textContent = this.ammo;
	this.context.save();
	this.context.globalAlpha = 0.2;
	this.context.fillRect(0, clientY, maxX, 1);
	this.context.fillRect(clientX, 0, 1, maxY);
	this.context.restore();
});

game.on("second", function(){
	for(const building of this.buildings){
		building && building.emit("second", this);
	}

	for(const trade of this.trade){
		trade && trade.emit("second", this);
	}
});

game.on("drop", function(bomb){
	const _this = this;
	bomb.on("destroy", function(){
		if(bomb.progress >= 99){
			const x = (bomb.x/maxX) * 10;
			_this.emit("hit", bomb);

			notif(`/\/ IMPACT/${~~(x)} /\/`);
		}
	});
});

game.on("hit", function(bomb){
	const x = ~~((bomb.x/maxX) * 10);
	const y = Building.rooftop(this, x, 0) + 1;
	const build = this.getBuildFromXY(x, y);

	if(!build)
		return ;

	//notif(`HIT BUILDING: ${x} / ${y}`);
	build.emit("hit", this, bomb);
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

function anyInstanceOf(target, ...args){
	for(const arg of args){
		if(target instanceof arg)
			return true;
	}

	return false;
}

function notif(message){
	const notif = document.querySelector(".notif");
	const entry = document.createElement("div");
	entry.textContent = message;

	notif.appendChild(entry);
	notif.scrollTo(0, notif.scrollHeight);
	entry.style.animation = `notif${([ ...notif.children ].length % 2)}`
		+ ` 20s`
	;
}

function siege(diff, duration = 5000){
	let last = difficulty;
	difficutly = diff;
	if(diff < 5)
	 	notif("CAUTION: ENEMY UNITS DETECTED");
	else
	 	notif("HIGH PRESENCE OF ENEMY UNITS DETECTED");
	notif(`- SCALE: ${~~(diff/5)}`)

	setTimeout(function(){
		notif("\/\/\/ LOGGED REDUCED ENEMY PRESENCE \/\/\/");
		difficulty = last;
	}, duration);
}

async function main(){
	if(document.readyState == "loading"){
		return window.addEventListener("DOMContentLoaded", main);
	}

	Building.scaffold = new Image();
	Building.scaffold.src = "./exp/scaffold.png";
	Object.assign(game, render());

	highlight(document.querySelector("body"))
	await tutorial(game);
	game.started = 1;

	//game.balance = 300;
	game.balance = 300;
	game.trade.push(new MissileTrade());

	notif("DEFENSK v" + VERSION);

	setInterval(function(){ game.emit("second"); }, 1000);

	new AbilityAutoDefense(game);

	let pos = 0;
	const { context } = render();
	let buildTypes = [
		[ "command", CommandBuilding ],
		[ "resident", ResidentBuilding ],
		[ "research", ResearchBuilding ],
		[ "trade", ResearchBuilding ],
		[ "transit", ResearchBuilding ],
		[ "factory", ResearchBuilding ]
	];
	const buildsDOM = document.querySelector(".base .builds");

	for(const type of buildTypes.map(function([ type ]){
		const dom = document.createElement("button");
		dom.classList.add(type);
		dom.style.backgroundImage = `url(./icon/${type}.png)`;

		return dom;
	})){
		buildsDOM.appendChild(type);
	}

	buildTypes = Object.fromEntries(buildTypes);

	let SelectedBuildType = null;
	let builderLock = 0;
	window.addEventListener("click", async function(click){
		if(builderLock)
			return ;

		function finish(){
			builderLock = 0;
		}

		if(!click.target.matches(".city, .city *"))
			return ;

		if(!SelectedBuildType)
			return ;

		SelectedBuildType.cost =
			SelectedBuildType.cost || 0
		;

		if(game.balance < SelectedBuildType.cost){
			return notif("-- [!] INSUFFICIENT BALANCE --");
		}

		builderLock = 1;

		const [ x, y ] = Building.getXYFromSlot(Building
			.getSlotFromPixelCoord(click.clientX, click.clientY)
		);

		let build = game.getBuildFromXY(x, y);
		if(build && !(build instanceof SelectorBuilding)){
			if(SelectedBuildType == DeleteBuilding){
				finish();
				return await game.deleteBuildFromXY(x, y);
			}

			finish();
			return ;
		}

		let roof = Building.rooftop(game, x, y);
		let roofBuild = game.getBuildFromXY(x, roof + 1);
		while(roofBuild instanceof SelectorBuilding){
			roof = roof + 1;
			roofBuild = game.getBuildFromXY(x, roof + 1);
		}

		if(roof != y){
			if(roofBuild instanceof SelectorBuilding)
				return finish();

			const exist = game.buildings.find(
				build => build instanceof SelectorBuilding
			);
			if(exist)
				game.buildings[game.buildings.indexOf(exist)]
					= null;

			roof = Building.rooftop(game, x, y);

			build = new SelectorBuilding(game);
			await build.task;
			build.place(game, x, roof);

			return finish();
		}

		build = new SelectedBuildType(game);
		if(build.fail)
			return finish()
		;
		await build.task;
		build.place(game, x, y);
		//alert(Building.rooftop(game, x, y));

		const exist = game.buildings.find(
			build => build instanceof SelectorBuilding
		);
		if(exist)
			game.buildings[game.buildings.indexOf(exist)]
				= null;

		finish();

		game.balance -= SelectedBuildType.cost;

		for(const el of document.body
			.querySelectorAll(".base .builds > *")
		) el.classList.remove("active");
		SelectedBuildType = null;
	});

	window.addEventListener("click", async function(click){
		if(!click.target.matches(".base .builds > *"))
			return ;

		for(const el of click.target.parentElement
			.querySelectorAll("*")
		) el.classList.remove("active");

		click.target.classList.add("active");
		SelectedBuildType = buildTypes[click.target.classList[0]];
		//alert(selectedBuildType = click.target.classList[0])
	});

	window.addEventListener("click", function(click){
		if(click.target.matches(".base, .base *, .city, .city *"))
			return ;

		if(game.ammo <= 0)
			return ;

		clientX = (click.clientX/window.innerWidth) * maxX;
		clientY = (click.clientY/window.innerHeight) * maxY;

		const missile = game.launchMissile(clientX, clientY);
		game.ammo--;
	});

	function move(mouse){
		clientX = (mouse.clientX/window.innerWidth) * maxX;
		clientY = (mouse.clientY/window.innerHeight) * maxY;
	}

	window.addEventListener("mousemove", move);

	setTimeout(function(){
		//siege(1000, 30000);
		siege(0.5, 30000);
	}, 3000)
	setInterval(function(){
		siege(10, 10000);
	}, 60000)

	/*let build = new CommandBuilding();
	await build.task;
	build.place(game, 2, 9);

	let command = build;
	setTimeout(function(){
		command.destroy();
	}, 3000);

	for(const [ x, y ] of [
		[ 3, 9 ],
		[ 3, 8 ],
		[ 3, 7 ],
		[ 3, 6 ],
		[ 3, 5 ],
		[ 3, 4 ],
		[ 4, 9 ],
		[ 4, 8 ],
		[ 4, 7 ],
		[ 5, 9 ],
		[ 5, 8 ],
		[ 5, 7 ],
		[ 5, 6 ]
	]){
		build = new ResidentBuilding();
		await build.task;
		build.place(game, x, y);
	}

	/*setInterval(function(){
		notif(`${Date.now()}`);
	}, 1000)*/
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
	src: [ "audio/launch.mp3" ],
	autoplay: false,
	loop: false,
	volume: v
});
const aalarm = new Howl({
	src: [ "audio/alarm.mp3" ],
	autoplay: false,
	loop: false,
	volume: v
});
const aquake = new Howl({
	src: [ "audio/quake.mp3" ],
	autoplay: false,
	loop: false,
	volume: v
});
const aexplosion = new Howl({
	src: [ "audio/explosion.wav" ],
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

