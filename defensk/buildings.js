Building.prototype.interface = {
	"div:right": {
		"button:fix:action-fix": "Fix",
		"button:fix:action-replace": "Rebuild"
	}
}

class PipBuilding extends Building {
	constructor(){
		super();
		const _this = this;
		const Type = this.constructor;
		this.task = new Promise(async function(res){
			_this.image =
				await PipBuilding.waitImage(Type.imageHit);
			await PipBuilding.waitImage(Type.imageOk);

			res();
		});

		this.seconds = 0;
		this.on("second", function(game){
			if(_this.hit){
				_this.image = Type.imageHit;
				return ;
			}

			_this.image = Type.imageOk;
			_this.seconds++;
		});

		this.on("hit", function(game, bomb, pass){
			if(_this.hit)
				return game.deleteBuild(_this);

			_this.hit = true;
			_this.image = Type.imageHit;
		});
	}
}

PipBuilding.Image = function(url){
	const image = new Image();
	new Promise(async res => { res();
		image.src = URL.createObjectURL(await (
			await fetch(url)
		).blob());
	});

	return image;
}

PipBuilding.waitImage = function(image){
	return new Promise(function(res){
		if(image.complete)
			res(image);

		image.addEventListener("load", function(){
			res(image);
		});
	});
}

class SelectorBuilding extends Building {
	constructor(){
		super();
		const _this = this;

		this.task = new Promise(async function(res){
			let image = _this.image = new Image();
			_this.imageOk = image;
			image.src = URL.createObjectURL(await (
				await fetch("./exp/selected.png")
			).blob());

			image.onload = res;
		});
	}
}

class DeleteBuilding {
	constructor(){
		throw new Error("Don't instantiate this vro");
	}
}
