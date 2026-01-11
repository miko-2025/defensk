class ResidentBuilding extends PipBuilding {
	constructor(){
		super();
		const _this = this;
		this.on("second", function(game){
			_this.onSecond(game);
		})
	}
}

ResidentBuilding.imageOk = PipBuilding.Image("./exp/resident.png");
ResidentBuilding.imageHit = PipBuilding.Image("./exp/resident-hit.png");

ResidentBuilding.prototype.onSecond = function(game){
	if(this.hit)
		return ;

	game.balance = (~~((game.balance + 0.9) * 10))/10;
}

ResidentBuilding.cost = 100;
