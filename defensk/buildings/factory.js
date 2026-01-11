class FactoryBuilding extends PipBuilding {
	constructor(){
		super();

		this.projects = [ new MissileProject ];
		const _this = this;

		this.on("second", function(game){
			const { projects } = _this;
			let now = Date.now();
			const ifs = {
				"div:name": "Factory",
				"div:right": {
					"button:fix:action-fix": "Fix",
					"button:replace:action-replace"
						: "Rebuild"
				}
			};
			const pifs = [];

			for(const project of projects){
				pifs.push({
					[`button:project:p${pifs.length}`]
						: project.name
							|| project.constructor
								.name
				});

				if(project.last + project.duration > now)
					continue ;

				project.last = now;
				project.forge(game);
			}

			pifs.push({ "div:empty:999": "", "button:add": "+" });

			for(const pif of pifs){
				Object.assign(ifs, pif);
			}

			_this.interface = ifs;
		});
	}
}
FactoryBuilding.imageOk = PipBuilding.Image("./exp/factory.png");
FactoryBuilding.imageHit = PipBuilding.Image("./exp/any-hit.png");
FactoryBuilding.cost = 500;
FactoryBuilding.frames = [
	PipBuilding.Image("./exp/factory.png"),
	PipBuilding.Image("./exp/factory2.png")
];
FactoryBuilding.seconds = 0;

setInterval(function(){
	FactoryBuilding.imageOk = FactoryBuilding.frames[
		FactoryBuilding.seconds++ % 2
	];
}, 1000);

class FactoryProject {
	constructor(){
		this.qpc = 1;
		this.duration = 3000;
		this.last = Date.now();
	}
}

FactoryProject.prototype.forge = function(){
	throw new Error("Forge unimplemented");
}

class MissileProject extends FactoryProject {

}

MissileProject.prototype.forge = function(game){
	game.ammo = Math.min(game.ammo + 1, 20);
}
