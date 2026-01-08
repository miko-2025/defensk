
class CommandBuilding extends Building {
	constructor(game){
		super();
		const _this = this;

		if(game.buildings.find(
			build => build instanceof CommandBuilding
		)){
			notif("ONLY ONE COMMAND BUILDING CAN BE BUILT");

			this.fail = 1;
			return undefined;
		}

		this.task = new Promise(async function(res){
			let image = _this.image = new Image();
			image.src = URL.createObjectURL(await (
				await fetch("./exp/command.png")
			).blob());

			image.onload = res;
		});

		this.revenues = [];
		this.seconds = 0;
		this.on("second", function(game){
			if(_this.hit)
				return ;

			_this.seconds++;

			if(_this.seconds % 120 == 0){
				_this.reportRevenue(game);
			}
		});

		this.on("hit", function(game, bomb, pass){
			if(_this.hit)
				return game.deleteBuild(_this);

			_this.hit = true;
			const image = new Image();
			image.src = "./exp/any-hit.png";
			image.onload = function(){
				_this.image = image;
			}
		});
	}
}
CommandBuilding.cost = 500;
CommandBuilding.prototype.reportRevenue = function(game){
	const { revenues } = this;
	revenues.unshift(game.balance);
	function calc(n){ return ~~(revenues[0] - revenues[n]); }

	if(revenues.length == 1){
		notif("[ COMMAND / REPORT / REVENUE]");
		notif(`${revenues[0]} + FIRST ---`);
		notif(``);
		notif(`[ / END ]`)
	} else {
		[
			"[ COMMAND / REPORT / REVENUE]",
			`BALANCE: ${revenues[0]}`,
			`${calc(1)} + FROM LAST ---`,
			`${calc(2)} + FROM 2 AGO --`,
			`${calc(3)} + FROM 3 AGO --`,
			`${calc(4)} + FROM 4 AGO --`,
			`[ / END ]`,
		].map(function(text, i){
			setTimeout(() => notif(text), i*1000);
		})
	}
}

CommandBuilding.prototype.destroy = function(){
	notif("[!] ATTENTION");
	notif("COMMAND CENTER IS LOST.");
	notif("MANAGEMENT SYSTEM WILL SUFFER");
}

class ResearchBuilding extends Building {

}

class ResidentBuilding extends Building {
	constructor(){
		super();
		const _this = this;

		this.task = new Promise(async function(res){
			let image = _this.image = new Image();
			image.src = URL.createObjectURL(await (
				await fetch("./exp/resident.png")
			).blob());

			image.onload = res;
		});

		this.on("second", function(game){
			_this.onSecond(game);
		})

		this.on("hit", function(game, bomb, pass){
			if(_this.hit)
				return game.deleteBuild(_this);

			_this.hit = true;
			const image = new Image();
			image.src = "./exp/resident-hit.png";
			image.onload = function(){
				_this.image = image;
			}
		});
	}
}

ResidentBuilding.prototype.onSecond = function(game){
	if(this.hit)
		return ;

	game.balance = (~~((game.balance + 0.9) * 10))/10;
}

ResidentBuilding.cost = 100;

class SelectorBuilding extends Building {
	constructor(){
		super();
		const _this = this;

		this.task = new Promise(async function(res){
			let image = _this.image = new Image();
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
