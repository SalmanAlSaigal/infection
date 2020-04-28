const CREATURE_SIZE = 10;
const CREATURE_COUNT = 50;
const CREATURE_COLORS = {
  sus: "#4fd3ff",
  inf: "#ff8597",
  rem: "#c9c9c9",

  inf_glow: "#ff859705",
};

const BACKGROUND_COLOR = "#161616";

const INFECT_RADIUS_FRAC = 5;
const HEAL_PROB = 0.001;
const INFECT_PROB = 0.01;

window.addEventListener("load", () => {
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
  const genesis = () => {
    creatures = [];
    for (let i = 0; i < CREATURE_COUNT; i++)
      creatures.push({
        pos: new Victor(
          Math.random() * canvas.width,
          Math.random() * canvas.height
        ),
        vel: new Victor(),
        acc: new Victor(Math.random() * 2 - 1, Math.random() * 2 - 1),
        state: "sus",
      });
    creatures[0].state = "inf";
  };
  genesis();

  // Main loop. Updates creatures and contains their logic
  const loop = () => {
    const infected = creatures.filter(({ state }) => state === "inf");

    creatures.forEach((c) => {
      if (
        c.state === "sus" &&
        infected.some(({ pos: infPos }) => {
          const withinReact =
            c.pos.distance(infPos) < INFECT_RADIUS_FRAC * CREATURE_SIZE;
          const incident = Math.random() < INFECT_PROB;

          return withinReact && incident;
        })
      )
        c.state = "inf";
      else if (c.state === "inf" && Math.random() < HEAL_PROB) c.state = "rem";

      c.vel.add(c.acc);
      c.vel.limit(1, 0.8);
      c.pos.add(c.vel);

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

      if (Math.random() > 0.95 || outOfBounds) {
        c.acc = new Victor(Math.random() * 2 - 1, Math.random() * 2 - 1);
        c.acc.normalize();
      }
    });
  };
  setInterval(loop, 16);

  // Renders creatures to canvas
  const render = () => {
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    creatures.forEach(({ pos: { x, y }, vel, acc, state }) => {
      ctx.beginPath();
      ctx.fillStyle = CREATURE_COLORS[state];
      ctx.arc(x, y, CREATURE_SIZE, 0, 2 * Math.PI);
      ctx.fill();

      if (state === "inf") {
        ctx.beginPath();
        ctx.fillStyle = CREATURE_COLORS.inf_glow;
        ctx.arc(x, y, CREATURE_SIZE * INFECT_RADIUS_FRAC, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    requestAnimationFrame(render);
  };
  render();
});
