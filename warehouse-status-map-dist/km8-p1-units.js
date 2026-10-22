(function () {
  const KM8P1_PLAN_VIEWBOX = {
    width: 842,
    height: 1191,
    source: "BIZ KM.8 PHASE1 LAYOUT.pdf",
    project: "CHOD BIZ BANGNA KM.8 P.1"
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

  const polygonUnit = (unitId, block, points, area = 0) => {
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    const c = centroid(points);
    return {
      unitId,
      project: KM8P1_PLAN_VIEWBOX.project,
      block,
      unitNo: unitId,
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

  // PDF wall/divider coordinates, in the unchanged 842 x 1191 background space.
  // Reuse stops for both sides of a divider instead of subdividing bounding boxes.
  const verticalRows = (ids, block, left, right, stops) => ids.map((id, i) =>
    polygonUnit(id, block, [[left, stops[i]], [right, stops[i]],
      [right, stops[i + 1]], [left, stops[i + 1]]])
  );
  const horizontalCols = (ids, block, top, bottom, stops) => ids.map((id, i) =>
    polygonUnit(id, block, [[stops[i], top], [stops[i + 1], top],
      [stops[i + 1], bottom], [stops[i], bottom]])
  );
  const northDividers = [83.701, 115.651, 147.271, 178.891, 210.511,
    242.131, 273.751, 305.341, 337.261];
  const westColumns = [281.34, 313.59, 345.18, 376.8, 408.42, 440.64];
  const eastColumns = [465.96, 498.21, 529.83, 561.45, 593.04, 624.66, 656.94];
  const jRightEdges = [450.48, 450.48, 450.48, 456.78, 456.78, 456.78, 463.14, 463.14];
  const jUnits = ["J8", "J7", "J6", "J5", "J4", "J3", "J2", "J1"].map((id, i) => {
    const top = northDividers[i];
    const bottom = northDividers[i + 1];
    const right = jRightEdges[i];
    const points = [[378.06, top]];
    // Preserve the exact shared segment at the two setbacks in the east wall.
    if (i && right !== jRightEdges[i - 1]) points.push([jRightEdges[i - 1], top]);
    points.push([right, top], [right, bottom], [378.06, bottom]);
    return polygonUnit(id, "J", points);
  });

  const km8P1Units = [
    ...verticalRows(["AA8", "AA7", "AA6", "AA5", "AA4", "AA3", "AA2", "AA1"], "AA", 211.86, 284.22, northDividers),
    ...jUnits,
    ...verticalRows(["A1", "A2"], "A", 210.48, 262.38, [400.021, 432.271, 464.521]),
    ...horizontalCols(["C1", "C2", "C3"], "C", 412.681, 464.521, [281.34, 313.59, 345.21, 377.46]),
    ...horizontalCols(["D1", "D2", "D3", "D4", "D5", "D6", "D7"], "D", 391.201, 464.521,
      [415.38, 447.63, 479.25, 510.84, 542.46, 574.08, 605.7, 637.92]),
    ...verticalRows(["I1", "I2", "I3", "I4", "I5", "I6", "I7", "I8"], "I", 739.14, 790.98,
      [427.321, 459.571, 491.191, 522.811, 554.431, 586.021, 617.641, 649.261, 681.481]),
    ...verticalRows(["B1", "B2", "B3", "B4"], "B", 210.48, 262.38, [578.341, 617.551, 649.171, 680.791, 720.001]),
    ...horizontalCols(["E1", "E2", "E3", "E4", "E5"], "E", 578.341, 630.181, westColumns),
    ...horizontalCols(["G1", "G2", "G3", "G4", "G5"], "G", 668.161, 720.001, westColumns),
    ...horizontalCols(["F1", "F2", "F3", "F4", "F5", "F6"], "F", 578.341, 630.181, eastColumns),
    ...horizontalCols(["H1", "H2", "H3", "H4", "H5", "H6"], "H", 668.161, 720.001, eastColumns)
  ];

  window.KM8P1_PLAN_VIEWBOX = KM8P1_PLAN_VIEWBOX;
  window.km8P1Units = km8P1Units;
})();
