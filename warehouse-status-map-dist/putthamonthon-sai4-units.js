(function () {
  const PTS4_PLAN_VIEWBOX = {
    width: 1684,
    height: 2384,
    source: "LAYOUT PLAN.pdf",
    project: "CHODBIZ PUTTHAMONTHON SAI 4"
  };

  const centroid = (points) => {
    let twiceArea = 0;
    let x = 0;
    let y = 0;
    points.forEach(([ax, ay], index) => {
      const [bx, by] = points[(index + 1) % points.length];
      const cross = ax * by - bx * ay;
      twiceArea += cross;
      x += (ax + bx) * cross;
      y += (ay + by) * cross;
    });
    return { x: x / (3 * twiceArea), y: y / (3 * twiceArea) };
  };

  const polygonUnit = (unitId, unitNo, block, points, area = 0) => {
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    const c = centroid(points);
    return {
      unitId,
      project: PTS4_PLAN_VIEWBOX.project,
      block,
      unitNo,
      points,
      labelX: c.x,
      labelY: c.y,
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
      area
    };
  };

  // Measured PDF wall/divider coordinates in the unchanged background space.
  const verticalRows = (ids, rightEdges, stops) => ids.map((id, i) => {
    const right = typeof rightEdges === "number" ? rightEdges : rightEdges[i];
    const nextRight = typeof rightEdges === "number" ? rightEdges : rightEdges[i + 1];
    const points = [[890.668, stops[i]], [right, stops[i]], [right, stops[i + 1]]];
    if (nextRight && nextRight < right) points.push([nextRight, stops[i + 1]]);
    points.push([890.668, stops[i + 1]]);
    return polygonUnit(id, id, "E", points);
  });
  const corridorRows = (ids, stops, topRight, bottomRight) => {
    const edge = y => topRight + (bottomRight - topRight) * (y - stops[0]) / (stops[stops.length - 1] - stops[0]);
    const seams = stops.map(y => [[867.744, y], [edge(y), y]]);
    return ids.map((id, i) => polygonUnit(id, id, id[0],
      [seams[i][0], seams[i][1], seams[i + 1][1], seams[i + 1][0]]));
  };
  const stripUnits = (ids, seams, steps = {}) => ids.map((id, i) => {
    const points = [steps[i] || seams[i][0], seams[i + 1][0]];
    if (steps[i + 1]) points.push(steps[i + 1]);
    points.push(seams[i + 1][1], seams[i][1]);
    return polygonUnit(id, id, id[0], points);
  });

  const pts4UnitPolygons = [
    ...verticalRows(["E25", "E24", "E23", "E22", "E21", "E20"], 998.566,
      [98.403, 141.665, 184.146, 226.508, 268.989, 311.47, 354.732]),
    ...verticalRows(["E19", "E18", "E17", "E16", "E15", "E14"], 995.926,
      [388.693, 431.954, 474.316, 516.797, 559.279, 601.64, 644.902]),
    ...verticalRows(["E13", "E12", "E11", "E10", "E9", "E8"], [995.926, 995.926, 995.926, 995.926, 990.885, 990.885],
      [678.863, 722.184, 764.606, 807.087, 849.449, 891.93, 935.191]),
    ...verticalRows(["E7", "E6", "E5", "E4", "E3"], [979.003, 979.003, 979.003, 973.842, 973.842],
      [969.153, 1012.414, 1054.895, 1097.257, 1143.098, 1189.84]),
    ...verticalRows(["E2", "E1"], 965.441, [1223.801, 1278.103, 1332.405]),
    ...corridorRows(["D4", "D3", "D2", "D1"], [1373.386, 1458.709, 1543.552, 1628.515, 1713.718], 964.99, 940.296),
    ...corridorRows(["C2", "C1"], [1748.519, 1842.362, 1957.746], 937.656, 922.593),
    ...stripUnits(["B3", "B2", "B1"], [
      [[552.872, 2003.647], [539.91, 2107.631]],
      [[595.64, 2008.927], [582.665, 2112.191]],
      [[637.63, 2014.207], [624.785, 2117.471]],
      [[693.055, 2021.168], [679.55, 2124.311]]
    ]),
    ...stripUnits(["A7", "A6", "A5", "A4", "A3", "A2", "A1"], [
      [[848.481, 2068.509], [837.499, 2154.732]],
      [[891.088, 2073.85], [880.527, 2159.25]],
      [[933.335, 2079.13], [922.654, 2164.533]],
      [[974.142, 2093.65], [964.782, 2169.813]],
      [[1016.209, 2098.87], [1006.847, 2175.093]],
      [[1057.196, 2113.451], [1048.914, 2180.373]],
      [[1099.323, 2118.611], [1091.042, 2185.653]],
      [[1141.81, 2124.011], [1133.349, 2190.974]]
    ], { 2: [932.135, 2087.17], 4: [1015.249, 2106.431] })
  ];

  window.PTS4_PLAN_VIEWBOX = PTS4_PLAN_VIEWBOX;
  window.pts4UnitPolygons = pts4UnitPolygons;
})();
