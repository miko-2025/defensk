class MissileTrade extends Trade {
	constructor(){
		super(5);

		const _this = this;
		this.on("second", function(game){
			if(game.balance < _this.cost)
				return ;

			if(game.ammo >= 20)
				return ;

			game.balance -= _this.cost;
			game.ammo = Math.min(game.ammo + 1, 20);
		});
	}
}
