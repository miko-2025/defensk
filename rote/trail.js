class Trail {
	constructor(path, op = {}){
		this.path = window.location.origin
			+ window.location.pathname
			+ path
		;

		this.frames = [];
		this.frames.vflip = [];

		this.constructor.list.push(this);
		this.onFrameLoad = op.onFrameLoad || Trail.modifier.default;
		this.fastMode = op.fastMode && true;

		const _this = this;
		this.promise = new Promise(async (rs, rj) => {
			if(!op.noload) await _this.loadConfig(op);

			_this.style = op.style || {};
			_this.offsetX = op.offsetX || 0;
			_this.offsetY = op.offsetY || 0;

			if(!op.noload) await _this.load(op);

			op.duration && _this.setDuration(op.duration);
			rs();
		});
	}
}

Trail.modifier = {};
Trail.modifier.default = async function(frame, i, _this){
	_this.frames[i - 1] = frame;
};

Trail.modifier.vflip = async function(frame, i, _this){
	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");

	canvas.width = frame.width;
	canvas.height = frame.height;

	ctx.save();
	ctx.scale(-1, 1);
	ctx.drawImage(frame, 0, 0, frame.width*-1, frame.height);
	ctx.restore();

	_this.frames[i - 1]
		= await createImageBitmap(ctx.getImageData(0, 0,
			canvas.width,
			canvas.height
		))
	;
}

Trail.fps = 60;
Trail.list = [];
Trail.prototype.loadConfig = async function loadConfig(op){ try {
	const config = await (await this.fetch("config.json")).json();
	Object.assign(op);
	return config;
} catch(err){
	return null;
} }

Trail.prototype.load = async function load(op){
	let i = 1;

	const _this = this;
	async function push(frame, i){
		//_this.frames[i - 1] = frame;
		_this.onFrameLoad
			&& await _this.onFrameLoad(frame, i, _this);
		/*try {
		} catch(error){ alert(error); }
		*/
		//console.log(`${i} ${_this.frames[i]} ${_this.frames.vflip[i]}`);
	}

	function fzip(i){ return new Promise(async function(res, rej){
		const tasks = [];
		const slashed = _this.path;

		let j = 0;
		while(slashed[slashed.length - j] == '/') j++;
		const path = slashed.slice(0, j*-1) || slashed;

		let abort = 0
		let raw;
		let rawAb;
		let rawUi8;

		try {
			raw = await fetch(`${path}.zip`);
			rawAb = await raw.arrayBuffer();
			rawUi8 = new Uint8Array(rawAb);
		} catch(err){
			rej(err);
		}

		let rj, rs;
		let promise = new Promise(
			(res, rej) => (rs = res) && (rj = rej)
		);
		fflate.unzip(rawUi8, function(err, data){
			rs(data);
		});

		const data = await promise;
		//alert(Object.entries(data).map((e) => `${e[0]}`));
		//alert(Object.values(data).map(d => d.constructor.name));
		if(!data)
			return rej();
		while(1){
			let index = '00000';
			index = index.slice(`${i}`.length) + `${i}.png`;

			let j = i;
			tasks.push(new Promise((rs, rj) => {
				const frame = new Image();
				op.style && Object.assign(frame.style, op.style);

				if(!data[`frame_${index}`]){
					rj();
					return abort = 1;
				}

				/*alert(`frame_${index}`);
				alert(data[`frame_${index}`].constructor.name)
				alert(data[`frame_${index}`])*/

				frame.src = URL.createObjectURL(
					new Blob([data[`frame_${index}`]])
				);
				//console.log(frame.src.slice(0, 50));
				frame.onload = () => rs(frame);
				frame.onerror = (err) => rj(err);
			}).then(frame => push(frame, j)).catch((err) => {
				//console.log(`[error] /frame_${index}`);

				abort = 1;
			}))

			i++;

			if(abort)
				break ;
		}

		await Promise.all(tasks);
		res();
	}); }

	async function f(i){
		const limit = i + 51;
		const tasks = [];
		const path = _this.path;

		let abort = 0;

		while(i < limit){
			let index = '00000';
			index = index.slice(`${i}`.length) + `${i}.png`;
			//console.log('/frame_' + index);

			let j = i;
			tasks.push(new Promise(async (rs, rj) => {
				const frame = new Image();
				op.style && Object.assign(frame.style, op.style);

				frame.src = URL.createObjectURL(await
					(await _this.fetch(
						`${_this.path}/frame_${index}`.trim()
					)).blob()
				);
				//console.log(frame.src.slice(0, 50));
				frame.onload = () => rs(frame);
				frame.onerror = (err) => rj(err);
			}).then(frame => push(frame, j)).catch((err) => {
				//console.log(`[error] /frame_${index}`);

				abort = 1;
			}));

			i++;

			// ease burden for browser, allow disabling?
			this.fastMode && await Promise.all(tasks);
		}

		await Promise.all(tasks);

		if(abort){
			return ;
		}

		return f(i);
	}

	try {
		await fzip(1);
		//await f(1);
	} catch(error){
		await f(1);
	}

	i = 0;
	const _60f = [];
	//_60f.vflip = [];
	while(i < this.frames.length){
		_60f.push(this.frames[Math.floor(i)]);
		//_60f.vflip.push(this.frames.vflip[Math.floor(i)]);

		i += 12/60;
	}

	//alert([_60f.length, _60f.vflip.length])
	this.files = this.frames;
	this.frames = _60f;
}
Trail.prototype.fetch = fetch.bind(window);
Trail.prototype.setDuration = function(second){
	const result = [];
	//result.vflip = [];
	const cap = second * 60;

	for(let i = 0; i < cap; i++){
		result[i] = this.frames[
			Math.floor(this.frames.length / cap * i)
		];

		/*result.vflip[i] = this.frames.vflip[
			Math.floor(this.frames.vflip.length / cap * i)
		];*/
	}

	this.frames = result;
}

/*Trail.prototype.setDuration = function(second){
	const result = [];
	result.vflip = [];
	const total = second*60;
	const delta = this.frames.length/total;

	for(let i = 0; i < total; i += delta){
		const j = Math.floor(i);

		result.push(this.frames[j]);
		result.vflip.push(this.frames.vflip[j]);
	}

	console.log(`${this.frames.length} ${result.length}`);

	this.frames = result;
}*/

Trail.prototype.setType = function(type){
	if(this.fetch = this.types[type]); else {
		this.fetch = this.types["fetch"];

		return -1;
	}

	return 0;
}
Trail.types = {};
Trail.types["fetch"] = fetch;
Trail.types["zip"] = async function(){
	if(global.zip)
		throw new Error("ZIP library is missing");

	throw new Error("unfinished");
};

void function(){
	class Player extends EventSystem {
		constructor(trail, context, op = {}){
			super();
			this.i = op.i || 0;
			this.x = op.x || 0;
			this.y = op.y || 0;
			this.w = op.w || 100;
			this.h = op.h || 100;

			this.offsetX = op.offsetX || 0;
			this.offsetY = op.offsetY || 0;

			this.trail = trail;
			this.trails = Object.assign({ trail },
				op.trails || {}
			);
			this.op = op;
			this.context = context;
			this.direction = 1;
			this.playing = 1;
			this.filter = '';
			this.repeat = "";
		}
	}

	Player.prototype.swap = function(key){
		this.trail = this.trails[key] || this.trails.error;

		//this.emit("swap", key);
	}

	Player.prototype.incr = function(){
		const { frames } = this.trail;
		this.i += this.direction;
		if(this.i >= frames.length){
			this.i = frames.length - 1;
			this.emit("end", this);
		} else if(this.i < 0){
			this.i = 0;
			this.emit("start", this);
		}
		this.emit("frame");

	}

	Player.prototype.next = function next(sx, sy, sw, sh){
		const { frames } = this.trail;
		if(this.i >= frames.length){
			this.i = frames.length - 1;
			this.emit("end", this);
		} else if(this.i < 0){
			this.i = 0;
			this.emit("start", this);
		}
		this.emit("frame");

		//const { sx, sy, sw, sh } = source || {};
		//const { dx, dy, dw, dh } = dest || {};
		this.draw(sx, sy, sw, sh);

		//this.emit("frame", this);

		if(!this.playing)
			return ;

		if(this.i >= frames.length){
			this.i = frames.length - 1;
			this.emit("end", this);
		} else if(this.i < 0){
			this.i = 0;
			this.emit("start", this);
		}
		//console.log(`${this.i}, ${this.direction}, ${frames.length}`);
	}

	Player.prototype.draw = function(sx, sy, sw, sh){
		const { frames } = this.trail;
		const image = frames[this.i|0];
		if(!image)
			return ;

		const f = Math.round;
		this.context.drawImage(image,
			f((sx || 0) / this.w * image.width),
			f((sy || 0) / this.h * image.height),
			f((sw || this.w) / this.w * image.width),
			f((sh || this.h) / this.h * image.height),
			f(this.x + this.offsetX),
			f(this.y + this.offsetY),
			f(sw || this.w),
			f(sh || this.h)
		);
	}

	Player.prototype.clear = function clear(){
		this.context.clearRect(this.x, this.y, this.w, this.h);
	}

	Player.prototype.jump = function jump(per){
		this.i = Math.floor(per*this.trail.frames.length);
	}

	Object.defineProperties(Player.prototype, {
		frame: {
			get(){
				return this.trail.frames[this.i];
			}
		},

		/*
		h: {
			get(){
				return this._h;
			},

			set(n){
				console.log(
					(new Error("aaa")).stack.toString()
				|| "Hmm");

				return this._h = n;
			}
		}*/
	});

	Trail.Player = Player;

	class PlayerStack extends EventSystem {
		constructor(players){
			super();
			this.players = players || [];

			if(!this.players)
				throw console.log((new Error()).stack)
		}
	}

	PlayerStack.prototype.next = function next(){
		if(!this.players)
			throw console.log((new Error()).stack)


		const i = this.players.map(p => (p.next(), [
			p.i, p.trail.frames.length
		]));
		if(!i.filter(([ e ]) => e > 0)[0]){
			this.emit("start", this);
		}

		if(!i.filter(([ e, max ]) => e < max)[0]){
			this.emit("end", this);
		}

		this.emit("frame", this);
	}

	PlayerStack.prototype.draw = function(sx, sy, sw, sh){
		this.players.map(p => p.draw(sx, sy, sw, sh));
	}

	PlayerStack.prototype.jump = function jump(percent){
		return this.players.map(p => p.jump(percent));
	}

	PlayerStack.prototype.swap = function swap(key){
		return this.players.map(p => p.swap(key));
	}

	Object.defineProperties(PlayerStack.prototype, {
		x: {
			get(){
				return this.players[0].x;
			},

			set(x){
				return this.players.map(p => p.x = x);
			}
		},
		y: {
			get(){
				return this.players[0].y;
			},

			set(y){
				return this.players.map(p => p.y = y);
			}
		},
		w: {
			get(){
				return this.players[0].w;
			},

			set(w){
				return this.players.map(p => p.w = w);
			}
		},
		h: {
			get(){
				return this.players[0].h;
			},

			set(h){
				return this.players.map(p => p.h = h);
			}
		},
		direction: {
			get(){
				return this.players[0].direction;
			},

			set(n){
				return this.players.map(p => p.direction = n);
			}
		},
		context: {
			get(){
				return this.players[0].context;
			},

			set(n){
				return this.players.map(p => p.context = n);
			}
		},
		offsetX: {
			get(){
				return this.players[0].offsetX;
			},

			set(n){
				return this.players.map(p => p.offsetX = n);
			}
		},
		offsetY: {
			get(){
				return this.players[0].offsetY;
			},

			set(n){
				return this.players.map(p => p.offsetY = n);
			}
		},
		playing: {
			get(){
				return this.players[0].playing;
			},

			set(n){
				return this.players.map(p => p.playing = n);
			}
		}
	})

	Trail.Player.Stack = PlayerStack;
}();
