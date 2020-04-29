const CREATURE_SIZE = 10;

const COLORS = {
  background: "#161616",

  sus: "#4fd3ff",
  inf: "#ff8597",
  rem: "#c9c9c9",

	ignore_social_distance: '#f00',

  inf_glow: "#ff859710",
  social_distance: "#a0a00010",
};

window.addEventListener("load", () => {
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

  var creatureCountSlider = document.getElementById(
    "creature-count-slider"
  );
  creatureCountSlider.addEventListener("change", (e) => {
    options.creatureCount = e.target.value;
		genesis(options.creatureCount)
  });
  var infectionRadiusSlider = document.getElementById(
    "infection-radius-slider"
  );
  infectionRadiusSlider.addEventListener("input", (e) => {
    options.infectionRadius = e.target.value;
  });
  var socialDistanceSlider = document.getElementById(
    "social-distance-slider"
  );
  socialDistanceSlider.addEventListener("input", (e) => {
    options.socialDistance = e.target.value;
  });
  var infProbSlider = document.getElementById(
    "infect-prob-slider"
  );
  infProbSlider.addEventListener("input", (e) => {
    options.infProb = e.target.value;
  });
  var healProbSlider = document.getElementById(
    "heal-prob-slider"
  );
  healProbSlider.addEventListener("input", (e) => {
    options.healProb = e.target.value;
  });
  var ignoreSocialDistanceSlider = document.getElementById(
    "ignore-social-distance-slider"
  );
  ignoreSocialDistanceSlider.addEventListener("input", (e) => {
    options.ignoreSocialDistance = e.target.value;
  });

  // User interaction options
  var options = {
		creatureCount: creatureCountSlider.value,

    playing: true,
    infectionRadius: infectionRadiusSlider.value,
    socialDistance: socialDistanceSlider.value,

		infProb: infProbSlider.value,
		healProb: healProbSlider.value,
		spontaniousInfectionProb: .0001,

		ignoreSocialDistance: ignoreSocialDistanceSlider.value
  };


  const canvas = document.getElementById("simulation");
  const ctx = canvas.getContext("2d");

  let [topLeft, bottomRight] = [
    new Victor(CREATURE_SIZE, CREATURE_SIZE),
    new Victor(canvas.width, canvas.height),
  ];

  // Handle canvas sizing
  const setCanvasSize = () => {
    canvas.width = window.innerWidth * 0.9;
    canvas.height = "500";
    bottomRight = new Victor(canvas.width - CREATURE_SIZE, 500 - CREATURE_SIZE);
  };
  setCanvasSize();
  window.addEventListener("resize", setCanvasSize, false);

  // Generate creatures
  let creatures = [];
  var genesis = (creatureCount) => {
    creatures = [];
    for (let i = 0; i < creatureCount; i++)
      creatures.push({
        pos: new Victor(
          Math.random() * canvas.width,
          Math.random() * canvas.height
        ),
        vel: new Victor(),
        acc: new Victor(Math.random() * 2 - 1, Math.random() * 2 - 1), // Generate at random between -1 and 1
        state: "sus", // Possible states are Susciptable(sus), Infected(inf), and Removed(rem)
      });
    creatures[0].state = "inf";
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
          c1.pos.distance(c2.pos) < options.socialDistance
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
              c.pos.distance(infPos) < options.infectionRadius;
            const incident = Math.random() < options.infProb;

            return withinReact && incident;
          }))
      )
        c.state = "inf";
      else if (c.state === "inf" && Math.random() < options.healProb) c.state = "rem";

      // Keep creatures inside box
      let outOfBounds = false;
      if (c.pos.x <= CREATURE_SIZE) {
        c.pos.x = CREATURE_SIZE;
        outOfBounds = true;
      } else if (c.pos.x > canvas.width - CREATURE_SIZE) {
        c.pos.x = canvas.width - CREATURE_SIZE;
        outOfBounds = true;
      }
      if (c.pos.y < CREATURE_SIZE) {
        c.pos.y = CREATURE_SIZE;
        outOfBounds = true;
      } else if (c.pos.y > canvas.height - CREATURE_SIZE) {
        c.pos.y = canvas.height - CREATURE_SIZE;
        outOfBounds = true;
      }

      // Integrate motion
      if (options.socialDistance > 0 && index >= options.ignoreSocialDistance && c.neighbours.length > 0) {
        c.acc = new Victor();
        c.neighbours.forEach((n) => {
          const distance = c.pos.distance(n.pos);
          const diff = c.pos.clone();
          diff.subtract(n.pos);
          diff.x /= distance;
          diff.y /= distance;
          c.acc.add(diff);
        });
      } else if (c.acc.length() === 0 || Math.random() > 0.95 || outOfBounds) {
        // Change acceleration randomly on whenever you hit a wall
        c.acc = new Victor(Math.random() * 2 - 1, Math.random() * 2 - 1);
        c.acc.normalize();
      }

      c.vel.add(c.acc);
      c.vel.limit(1, 0.1);
      c.pos.add(c.vel);
    });
  };
  setInterval(loop, 16); // Loop every 16ms for 60 fps

  // Renders creatures to canvas
  const render = () => {
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    creatures.forEach(({ pos: { x, y }, vel, acc, state, neighbours = [] }, index) => {
      ctx.beginPath();
      ctx.fillStyle = COLORS[state];
      ctx.arc(x, y, CREATURE_SIZE, 0, 2 * Math.PI);
      ctx.fill();
			if(index < options.ignoreSocialDistance)
				{ctx.strokeStyle =COLORS.ignore_social_distance;
				ctx.stroke()}

      if (state === "inf") {
        ctx.beginPath();
        ctx.fillStyle = COLORS.inf_glow;
        ctx.arc(x, y, options.infectionRadius, 0, 2 * Math.PI);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.fillStyle = COLORS.social_distance;
      ctx.arc(x, y, options.socialDistance, 0, 2 * Math.PI);
      ctx.fill();

      ctx.lineWidth = 3;
      ctx.strokeStyle = COLORS.social_distance;
      ctx.beginPath();
      neighbours.forEach((n) => {
        ctx.moveTo(x, y);
        ctx.lineTo(n.pos.x, n.pos.y);
      });
      ctx.stroke();
    });

    requestAnimationFrame(render);
  };
  render();
});
