function highlight(dom){
	const hlel = document.querySelector(".highlight");
	const { top, left, right, bottom } = dom.getBoundingClientRect();

	hlel.style.setProperty("--x", left + 'px');
	hlel.style.setProperty("--y", top + 'px');
	hlel.style.setProperty("--h", (bottom - top) + 'px');
	hlel.style.setProperty("--w", (right - left) + 'px');
}

function prompt(message, x = 50, y = 50){
	const pel = document.querySelector(".prompt");
	pel.style.setProperty("--x", x + '%');
	pel.style.setProperty("--y", y + '%');
	pel.textContent = message;
}

const uwait = {
	click(){
		return new Promise(function(res){
			window.addEventListener("click", function f(ev){
				res(ev);
				window.removeEventListener("click", f)
			});
		});
	}
}

async function tutorial(game){
	game.balance = 0;
	game.ammo = 0;

	let bomb;
	let missile;
	let click;
	let button;

	const list = document.querySelector(".base .builds");

	prompt("Tap or Click to start");
	await uwait.click();
	prompt("Welcome to Defensk");
	await uwait.click();
	prompt(" ");
	bomb = game.dropBomb(maxX/2, 8);
	await new Promise(res => {
		game.on("hit", res);
	})

	highlight(document.querySelector("body"))
	prompt("That was a bomb");
	await uwait.click();
	highlight(document.querySelector(".status .missile"));
	prompt("Did you see that rocket icon?");
	game.ammo = 1;
	await uwait.click();
	prompt("That is the amount of missiles in your possession");
	await uwait.click();
	highlight(document.querySelector("body"))
	prompt("Click, or tap anywhere on screen");
	click = await uwait.click();
	game.ammo = 0;
	prompt(" ");
	game.clientX = (click.clientX/window.innerWidth) * maxX;
	game.clientY = (click.clientY/window.innerHeight) * maxY;

	missile = game.launchMissile(game.clientX, game.clientY);
	await new Promise(res => {
		missile.on("destroy", res);
	})
	prompt("That was a missile");
	await uwait.click();
	prompt("Obviously, you can't fire any missile"
		+ " when you possess zero missiles"
	);
	await uwait.click();
	prompt("Now, try to stop a bomb with your missile");
	await uwait.click();

	bomb = game.dropBomb(maxX/2, 8);
	let ended = 0;

	bomb.on("destroy", async function f(){
		if(bomb.progress >= 99){
			prompt("Try again. Predict the bomb's route");
			game.ammo = 5;
			bomb = game.dropBomb(maxX/2, 8);
			bomb.on("destroy", f);
		} else {
			prompt("Nice shot");
			ended = 1;
		}
	});

	game.ammo = 5;
	while(!ended){
		click = await uwait.click();
		if(ended)
			break ;
		if(game.ammo <= 0)
			continue ;

		game.clientX = (click.clientX/window.innerWidth) * maxX;
		game.clientY = (click.clientY/window.innerHeight) * maxY;
		missile = game.launchMissile(game.clientX, game.clientY);
		game.ammo--;
	}

	prompt("Now, try to stop 5 of them");

	game.ammo = 5;

	ended = 0;
	bomb = game.dropBomb(Math.random() * maxX, 8);
	bomb = game.dropBomb(Math.random() * maxX, 6);
	bomb = game.dropBomb(Math.random() * maxX, 4);
	bomb = game.dropBomb(Math.random() * maxX, 8);
	bomb = game.dropBomb(Math.random() * maxX, 7);
	while(game.bombs.length != 0){
		click = await uwait.click();
		if(game.ammo <= 0)
			continue ;

		game.clientX = (click.clientX/window.innerWidth) * maxX;
		game.clientY = (click.clientY/window.innerHeight) * maxY;
		missile = game.launchMissile(game.clientX, game.clientY);
		game.ammo--;
	}

	highlight(document.querySelector(".status"));
	prompt("See that dollar icon?")
	await uwait.click();
	game.balance = 300;
	prompt("That is the amount of money you possess");
	await uwait.click();
	prompt("Missiles replenish automatically through trade every second");
	await uwait.click();
	prompt("Each missile costs 5$");
	new Promise(async function(res){
		setTimeout(function f(){
			if(game.ammo >= 20)
				return res();

			game.balance -= 5;
			game.ammo++;
			setTimeout(f, 1000)
		}, 1000)
	})
	await uwait.click();
	highlight(document.querySelector("body"))
	prompt("You can disable this once you built a trade center");
	await uwait.click();
	prompt("After you built a missile factory of course!");
	await uwait.click();
	prompt("The limit of missile you can store at once is 20");
	await uwait.click();
	prompt("Which you can upgrade with a research center!");
	await uwait.click();
	prompt("Scroll down!");
	await uwait.click();
	prompt("This is the city building system");
	await uwait.click();
	prompt("You can select a building type you want to build");
	await uwait.click();
	prompt("on the array of rectangular buttons");
	button = document.createElement("button");
	button.style.backgroundImage = "url(./icon/resident.png)";
	button.classList.add("resident");
	list.appendChild(button);
	await uwait.click();
	prompt("To build a house, click the icon");
	await uwait.click();
	prompt("then click one of the empty space at the grid");
	await uwait.click();
	prompt("Try it! Build a residential.");
	let builds = [];
	let build;
	let slot;
	Object.assign(game, render());
	while(1){
		click = await uwait.click();
		if(!click.target.matches(".resident"))
			continue ;

		build = new ResidentBuilding();
		build.image = ResidentBuilding.imageOK;
		break ;
	}

	while(1){
		click = await uwait.click();
		if(!click.target.matches(".slot"))
			continue ;

		slot = Building.getXYFromSlot(click.target);
		build.place(game, slot[0], Building.rooftop(game, slot[0], 0));
		break ;
	}

	prompt("A residential costs 100$ to build and generates 0.9$"
		+ " per second"
	);

	builds.push(build);

	setTimeout(function f(){
		if(!builds)
			return ;

		for(const build of builds)
			build.emit("second", game);

		build.draw(game);
		setTimeout(f, 1000);
	}, 1000);

	await uwait.click();
	prompt("Prevent bombs from destroying your buildings");
	await uwait.click();
	await new Promise(function(res){
		bomb = game.dropBomb((slot[0]/10)*maxX, 10);
		game.on("hit", res);
	});
	prompt("Destroyed buildings does not perform");
	await uwait.click();
	prompt("Destroyed residentials does not produce money");
	await uwait.click();
	prompt("You can interact with buildings by clicking them");
	await uwait.click();
	prompt("You can fix destroyed building by clicking them and "
		+ "picking repair");
	await uwait.click();
	prompt("Or build a new one.");
	await uwait.click();

	builds = null;

	prompt("That concludes this tutorial, good luck, and have fun.");
	game.buildings = [];
	game.ammo = 0;
	list.textContent = '';

	await uwait.click();
	prompt("");
}
