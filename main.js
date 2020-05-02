const BAR_SIZE = 1;

const COLORS = {
  background: "#161616",

  sus: "#4fd3ff",
  inf: "#ff8597",
  rem: "#c9c9c9",

  ignore_social_distance: "#f00",

  inf_glow: "#ff859710",
  social_distance: "#a0a00010",
};

window.addEventListener("load", () => {
  document.getElementById("help-button").addEventListener("click", () => {
    $("#help-modal").modal("show");
  });
  if (localStorage.getItem("disableHelp") !== "true") $("#help-modal").modal("show");
  const disableHelpCheckbox = document.getElementById("hide-help-checkbox");
  disableHelpCheckbox.checked = localStorage.getItem("disableHelp") === "true";
  disableHelpCheckbox.addEventListener("click", (e) => {
    localStorage.setItem("disableHelp", e.target.checked);
  });

  // Handle user input
  var playButton = document.getElementById("play-button");
  playButton.addEventListener("click", () => {
    options.playing = !options.playing;
    playButton.innerHTML = options.playing ? "Pause" : "Play";
  });
  var resetButton = document.getElementById("reset-button");
  resetButton.addEventListener("click", () => {
    genesis(creatureCountSlider.value);
  });

  var creatureCountSlider = document.getElementById("creature-count-slider");
  creatureCountSlider.addEventListener("change", (e) => {
    document.getElementById("creature-count-slider-value").innerHTML =
      e.target.value;
    options.creatureCount = e.target.value;
    genesis(options.creatureCount);
  });
  var infectionRadiusSlider = document.getElementById(
    "infection-radius-slider"
  );
  infectionRadiusSlider.addEventListener("input", (e) => {
    document.getElementById("infection-radius-slider-value").innerHTML =
      e.target.value;
    options.infectionRadius = e.target.value;
  });
  var socialDistanceSlider = document.getElementById("social-distance-slider");
  socialDistanceSlider.addEventListener("input", (e) => {
    document.getElementById("social-distance-slider-value").innerHTML =
      e.target.value;
    options.socialDistance = e.target.value;
  });
  var infProbSlider = document.getElementById("infect-prob-slider");
  infProbSlider.addEventListener("input", (e) => {
    document.getElementById("infect-prob-slider-value").innerHTML = `${
      Math.floor(e.target.value * 10000) / 100
    }%`;
    options.infProb = e.target.value;
  });
  var healProbSlider = document.getElementById("heal-prob-slider");
  healProbSlider.addEventListener("input", (e) => {
    document.getElementById("heal-prob-slider-value").innerHTML = `${
      Math.floor(e.target.value * 10000) / 100
    }%`;
    options.healProb = e.target.value;
  });
  var ignoreSocialDistanceSlider = document.getElementById(
    "ignore-social-distance-slider"
  );
  ignoreSocialDistanceSlider.addEventListener("input", (e) => {
    document.getElementById("ignore-social-distance-slider-value").innerHTML =
      e.target.value;
    options.ignoreSocialDistance = e.target.value;
  });
  var spontaniousInfectionSlider = document.getElementById(
    "spontanious-infection-slider"
  );
  spontaniousInfectionSlider.addEventListener("input", (e) => {
    document.getElementById(
      "spontanious-infection-slider-value"
    ).innerHTML = `${Math.floor(e.target.value * 1000000) / 10000}%`;
    options.spontaniousInfectionProb = e.target.value;
  });

  // User interaction options
  var options = {
    creatureCount: creatureCountSlider.value,

    playing: true,
    infectionRadius: infectionRadiusSlider.value,
    socialDistance: socialDistanceSlider.value,

    infProb: infProbSlider.value,
    healProb: healProbSlider.value,
    spontaniousInfectionProb: spontaniousInfectionSlider.value,

    ignoreSocialDistance: ignoreSocialDistanceSlider.value,
  };

  const canvas = document.getElementById("simulation");
  const ctx = canvas.getContext("2d");
  const gCanvas = document.getElementById("graph");
  const gctx = gCanvas.getContext("2d");
  let graphData = [];
  let lastDrawnGraphLength = 0;

  let [topLeft, bottomRight] = [
    new Victor(options.creatureSize, options.creatureSize),
    new Victor(canvas.width, canvas.height),
  ];

  // Handle canvas sizing
  const setCanvasSize = () => {
    canvas.width = window.innerWidth * 0.9;
    canvas.height = "500";
    gCanvas.width = window.innerWidth * 0.9;
    gCanvas.height = "100";
    bottomRight = new Victor(
      canvas.width - options.creatureSize,
      500 - options.creatureSize
    );
    options.creatureSize = window.innerWidth / 100;
  };
  setCanvasSize();
  window.addEventListener("resize", setCanvasSize, false);

  // Generate creatures
  let updateCount = 0;
  let creatures = [];
	let startTime;
  var genesis = (creatureCount) => {
    graphData = [];
    creatures = [];
    for (let i = 0; i < creatureCount; i++)
      creatures.push({
        pos: new Victor(
          Math.random() * canvas.width,
          Math.random() * canvas.height
        ),
        vel: new Victor(),
        acc: new Victor(),
        state: "sus", // Possible states are Susciptable(sus), Infected(inf), and Removed(rem)
      });
    creatures[0].state = "inf";
    updateCount = 0;
		startTime = Date.now();
  };
  genesis(options.creatureCount);

  // Main loop. Updates creatures and contains their logic
  const loop = () => {
    if (!options.playing) return;

    // Pre-calculations for optimization
    const infected = creatures.filter(({ state }) => state === "inf");
    creatures.forEach((c) => (c.neighbours = []));
    creatures.forEach((c1) => {
      creatures.forEach((c2) => {
        if (
          c1 !== c2 &&
          !c1.neighbours.includes(c2) &&
          c1.pos.distance(c2.pos) <
            options.creatureSize * options.socialDistance
        ) {
          c1.neighbours.push(c2);
          c2.neighbours.push(c1);
        }
      });
    });

    creatures.forEach((c, index) => {
      // Handle state transitions
      if (
        Math.random() < options.spontaniousInfectionProb ||
        (c.state === "sus" &&
          infected.some(({ pos: infPos }) => {
            const withinReact =
              c.pos.distance(infPos) <
              options.creatureSize * options.infectionRadius;
            const incident = Math.random() < options.infProb;

            return withinReact && incident;
          }))
      )
        c.state = "inf";
      else if (c.state === "inf" && Math.random() < options.healProb)
        c.state = "rem";

      // Keep creatures inside box
      let outOfBounds = false;
      if (c.pos.x <= options.creatureSize) {
        c.pos.x = options.creatureSize;
        outOfBounds = true;
      } else if (c.pos.x > canvas.width - options.creatureSize) {
        c.pos.x = canvas.width - options.creatureSize;
        outOfBounds = true;
      }
      if (c.pos.y < options.creatureSize) {
        c.pos.y = options.creatureSize;
        outOfBounds = true;
      } else if (c.pos.y > canvas.height - options.creatureSize) {
        c.pos.y = canvas.height - options.creatureSize;
        outOfBounds = true;
      }

      // Integrate motion
      if (
        options.socialDistance > 0 &&
        index >= options.ignoreSocialDistance &&
        c.neighbours.length > 0
      ) {
        c.acc = new Victor();
        c.neighbours.forEach((n) => {
          const distance = c.pos.distance(n.pos);
          const diff = c.pos.clone();
          diff.subtract(n.pos);

          diff.x /= distance;
          diff.y /= distance;
					diff.x *= Math.random();
					diff.y *= Math.random();

          c.acc.add(diff);
        });
      } else if (c.acc.length() === 0 || outOfBounds) {
        // Change acceleration randomly on whenever you hit a wall
				c.vel = new Victor()
				c.acc = new Victor(2 * (Math.random() - .5), 2 * (Math.random() - .5));
				// c.acc.normalize();
      }else if ( Math.random() > .9 ){
				c.acc.rotateDeg(360 * (Math.random() - .5))
			}

      c.vel.add(c.acc);
      c.vel.limit(2, 0.5);
      c.pos.add(c.vel);
    });

    if (updateCount % 10 === 0) {
      let graphDataInsert = {
        sus: 0,
        inf: 0,
        rem: 0,
				time: Math.floor((Date.now() - startTime) / 100) / 10
      };
      creatures.forEach(({ state }) => graphDataInsert[state]++);
      graphData.push(graphDataInsert);
      if (graphData.length * BAR_SIZE > gCanvas.width) {
        graphData = graphData.slice(Math.floor(graphData.length * 0.3));
      }
    }
    updateCount++;
  };
  setInterval(loop, 16); // Loop every 16ms for 60 fps

  // Renders creatures to canvas
  const render = () => {
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    creatures.forEach(
      ({ pos: { x, y }, vel, acc, state, neighbours = [] }, index) => {
        ctx.beginPath();
        ctx.fillStyle = COLORS[state];
        ctx.arc(x, y, options.creatureSize, 0, 2 * Math.PI);
        ctx.fill();
        if (index < options.ignoreSocialDistance) {
          ctx.strokeStyle = COLORS.ignore_social_distance;
          ctx.stroke();
        }

        if (state === "inf") {
          ctx.beginPath();
          ctx.fillStyle = COLORS.inf_glow;
          ctx.arc(
            x,
            y,
            options.creatureSize * options.infectionRadius,
            0,
            2 * Math.PI
          );
          ctx.fill();
        }

        // ctx.beginPath();
        // ctx.fillStyle = COLORS.social_distance;
        // ctx.arc(x, y, options.creatureSize * options.socialDistance, 0, 2 * Math.PI);
        // ctx.fill();

        ctx.lineWidth = 3;
        ctx.strokeStyle = COLORS.social_distance;
        ctx.beginPath();
        neighbours.forEach((n) => {
          ctx.moveTo(x, y);
          ctx.lineTo(n.pos.x, n.pos.y);
        });
        ctx.stroke();
      }
    );

    if (graphData.length !== lastDrawnGraphLength) {
      gctx.fillStyle = COLORS.background;
      gctx.fillRect(0, 0, gCanvas.width, gCanvas.height);
      const graphLength = graphData.length;
      graphData.forEach(({ sus, inf, rem }, index) => {
        const x = index * BAR_SIZE;

        const remBarHeight = (rem / options.creatureCount) * gCanvas.height;
        const infBarHeight = (inf / options.creatureCount) * gCanvas.height;
        const susBarHeight = (sus / options.creatureCount) * gCanvas.height;

        let currentHeight = 0;
        gctx.fillStyle = COLORS.rem;
        gctx.fillRect(x, currentHeight, BAR_SIZE, remBarHeight);
        currentHeight += remBarHeight;

        gctx.fillStyle = COLORS.sus;
        gctx.fillRect(x, currentHeight, BAR_SIZE, susBarHeight);
        currentHeight += susBarHeight;

        gctx.fillStyle = COLORS.inf;
        gctx.fillRect(x, currentHeight, BAR_SIZE, infBarHeight);
        currentHeight += infBarHeight;
      });

			const textSize = 18
			gctx.font = `${textSize}px monospace`
			gctx.fillStyle = 'black';
			graphData.forEach(({time, sus, inf, rem}, index) => {
				if(index % 150 === 0)
				{
					gctx.fillStyle = '#0004';
					gctx.fillRect(index*BAR_SIZE, 0, 100, gCanvas.height);

					gctx.fillStyle = '#fff';
					gctx.fillRect(index * BAR_SIZE, 0, 1, gCanvas.height);
					gctx.fillText(`${time} sec`, index * BAR_SIZE + 16, textSize)

					gctx.fillStyle = (COLORS.sus);
					gctx.fillText(sus, index * BAR_SIZE + 16, textSize * 2)
					gctx.fillStyle = (COLORS.inf);
					gctx.fillText(inf, index * BAR_SIZE + 16, textSize * 3)
					gctx.fillStyle = (COLORS.rem);
					gctx.fillText(rem, index * BAR_SIZE + 16, textSize * 4)
				}
			});

      lastDrawnGraphLength = graphLength;
    }

    requestAnimationFrame(render);
  };
  render();
});
