class Game extends EventSystem {
	constructor(){
		super();
		const _this = this;
		(!isSecondary()) && requestAnimationFrame(function f(){
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
		this.clientX = 0;
		this.clientY = 0;

		Game.constructorExtended(this);
	}
}

Game.constructorExtended = function(game){
	let difficulty = 5;
	let last = 0;
	let last30 = 0;
	game.on("frame", function(){
		if(!this.context)
			return ;

		this.context.clearRect(
			0, 0,
			this.canvas.width, this.canvas.height
		);
		this.context.globalAlpha = 1;
		this.context.save();
		for(const missile of this.missiles){
			missile.draw(this);
		}

		this.context.globalAlpha = 0.3;
		for(const missile of this.missiles){
			missile.draw(this, 2);
		}

		this.context.globalAlpha = 0.1;
		this.context.font = `${maxX/20}px Black Ops One`;
		this.context.setLineDash([ 15, 10 ]);
		for(let i = 0; i < maxX; i += maxX/10){
			if(this.clientX < i)
				continue ;

			if(this.clientX > i + (maxX/10))
				continue ;

			this.context.fillText(`${~~((i / maxX) * 10)}`,
				i + (maxX/10)/2,
				maxY*(3/10)
			);
			this.context.strokeRect(i, 0, maxX/10, maxY);
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
			let type = Bomb;
			if((Math.random()*500) > 400){
				type = ClusterBomb;
			}

			if(game.started){
				const bomb = game.dropBomb(-1, 6
					+ (Math.random()*4),
				type);
			}
		}

		document.querySelector(".missile").textContent = this.ammo;
		this.context.save();
		this.context.globalAlpha = 0.2;
		this.context.fillRect(0, this.clientY, maxX, 1);
		this.context.fillRect(this.clientX, 0, 1, maxY);
		this.context.restore();
	});

	game.on("second", function(){
		for(const building of this.buildings){
			building && building.emit("second", this);
		}

		for(const trade of this.trade){
			trade && trade.emit("second", this);
		}

		this.context2.clearRect(0, 0,
			this.canvas.width*bScaleX,
			this.canvas.height*bScaleY
		);

		for(const build of this.buildings){
			if(build)
				build.draw(this);
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
}

function isSecondary(){
	return window.location.href.split('?')[0]
		.includes("/docs")
}

Game.prototype.onDCL = function(){
	if(isSecondary())
		return ;

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

Game.prototype.dropBomb = function(x, speed, Type){
	if(!Type)
		Type = Bomb;

	if(x < 0){
		x = Math.random()*maxX;
	}

	const game = this;
	const bomb = new Type(
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
