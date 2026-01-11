class CommandBuilding extends PipBuilding {
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

		this.revenues = [];
		this.on("second", function(){
			if(_this.seconds % 120 == 0){
				_this.reportRevenue(game);
			}
		});

		this.name = "High Command"
	}
}
CommandBuilding.imageOk = PipBuilding.Image("./exp/command.png");
CommandBuilding.imageHit = PipBuilding.Image("./exp/any-hit.png");
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

CommandBuilding.prototype.interface = {
	"div:right": {
		"button:fix": "Fix",
		"button:fix": "Replace"
	},
	"button:map": "Map",
	"div:empty": " ",
	"button:diplomacy": "Diplomacy",
	"div:empty": " ",
}

// TODO: Implement Map
// TODO: Implement Diplomacy
