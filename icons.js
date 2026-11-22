/* Inline SVG icon set (replaces emoji). ICON('name') returns an <svg> string that inherits the text color. */
(function () {
  'use strict';
  const PATHS = {
 "gamepad": "<rect x=\"2\" y=\"7\" width=\"20\" height=\"11\" rx=\"5\"/><path d=\"M7 10.5v4M5 12.5h4\"/><circle cx=\"15.5\" cy=\"11.5\" r=\".9\" fill=\"currentColor\"/><circle cx=\"18\" cy=\"14\" r=\".9\" fill=\"currentColor\"/>",
 "gift": "<rect x=\"3\" y=\"8\" width=\"18\" height=\"4\" rx=\"1\"/><path d=\"M12 8v13M5 12v8a1 1 0 001 1h12a1 1 0 001-1v-8M12 8c-2-4-6-3-5 0 .5 1.5 3 1 5 0zM12 8c2-4 6-3 5 0-.5 1.5-3 1-5 0z\"/>",
 "trophy": "<path d=\"M7 4h10v5a5 5 0 01-10 0zM7 6H4a3 3 0 003 4M17 6h3a3 3 0 01-3 4M12 14v4M8 21h8M10 18h4\"/>",
 "user": "<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7\"/>",
 "palette": "<path d=\"M12 3a9 9 0 100 18c1.2 0 2-.8 2-1.8 0-1-.8-1.4-.8-2.4 0-.9.7-1.6 1.6-1.6H17a4 4 0 004-4c0-4.4-4-8.2-9-8.2z\"/><circle cx=\"7.5\" cy=\"11\" r=\"1\" fill=\"currentColor\"/><circle cx=\"10.5\" cy=\"7\" r=\"1\" fill=\"currentColor\"/><circle cx=\"15\" cy=\"7.5\" r=\"1\" fill=\"currentColor\"/>",
 "speaker": "<path d=\"M4 9v6h4l5 4V5L8 9zM16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12\"/>",
 "speaker-off": "<path d=\"M4 9v6h4l5 4V5L8 9zM17 9l5 6M22 9l-5 6\"/>",
 "flame": "<path d=\"M12 22c4 0 7-2.8 7-7 0-3-1.6-5-3-6.5-.3 2-1.3 3-2.5 3 .5-3-1-6.5-4.5-9.5-.5 4-5 6-5 12 0 5 3.5 8 8 8z\"/>",
 "target": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"12\" cy=\"12\" r=\"5\"/><circle cx=\"12\" cy=\"12\" r=\"1.2\" fill=\"currentColor\"/>",
 "crosshair": "<circle cx=\"12\" cy=\"12\" r=\"7\"/><path d=\"M12 2v6M12 16v6M2 12h6M16 12h6\"/>",
 "bolt": "<path d=\"M13 2L4 14h7l-1 8 9-12h-7z\"/>",
 "pointer": "<path d=\"M5 3l14 7-6 2-2 6z\"/>",
 "code": "<path d=\"M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16\"/>",
 "keyboard": "<rect x=\"2\" y=\"6\" width=\"20\" height=\"12\" rx=\"2\"/><path d=\"M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10\"/>",
 "lock": "<rect x=\"5\" y=\"11\" width=\"14\" height=\"10\" rx=\"2\"/><path d=\"M8 11V8a4 4 0 018 0v3\"/>",
 "unlock": "<rect x=\"5\" y=\"11\" width=\"14\" height=\"10\" rx=\"2\"/><path d=\"M8 11V8a4 4 0 017.5-2\"/>",
 "medal": "<circle cx=\"12\" cy=\"15\" r=\"6\"/><path d=\"M8.5 3l3.5 6 3.5-6M12 12.2l1 2 2.2.3-1.6 1.5.4 2.2-2-1.1-2 1.1.4-2.2-1.6-1.5 2.2-.3z\"/>",
 "star": "<path d=\"M12 3l2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.2 6.4 20.3l1.2-6.3L3 9.6l6.3-.8z\"/>",
 "crown": "<path d=\"M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z\"/>",
 "dice": "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"4\"/><circle cx=\"8.5\" cy=\"8.5\" r=\"1.2\" fill=\"currentColor\"/><circle cx=\"15.5\" cy=\"15.5\" r=\"1.2\" fill=\"currentColor\"/><circle cx=\"12\" cy=\"12\" r=\"1.2\" fill=\"currentColor\"/>",
 "refresh": "<path d=\"M20 11a8 8 0 10-2.3 5.7M20 4v7h-7\"/>",
 "robot": "<rect x=\"4\" y=\"8\" width=\"16\" height=\"12\" rx=\"3\"/><path d=\"M12 8V5M9 13h.01M15 13h.01M9 17h6\"/><circle cx=\"12\" cy=\"4\" r=\"1\"/>",
 "globe": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18\"/>",
 "flag": "<path d=\"M5 22V3M5 4h12l-2 4 2 4H5\"/>",
 "sparkle": "<path d=\"M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z\"/>",
 "check": "<path d=\"M4 12l5 5L20 6\"/>",
 "question": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M9.5 9a2.5 2.5 0 115 0c0 1.7-2.5 2-2.5 4M12 17h.01\"/>",
 "shield": "<path d=\"M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z\"/>",
 "eye": "<path d=\"M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
 "drop": "<path d=\"M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z\"/>",
 "scissors": "<circle cx=\"6\" cy=\"6\" r=\"3\"/><circle cx=\"6\" cy=\"18\" r=\"3\"/><path d=\"M8.5 7.5L20 18M8.5 16.5L20 6\"/>",
 "frame": "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"3\"/><rect x=\"8\" y=\"8\" width=\"8\" height=\"8\" rx=\"1.5\"/>",
 "timer": "<circle cx=\"12\" cy=\"13\" r=\"8\"/><path d=\"M12 9v4l3 2M9 2h6\"/>",
 "link": "<path d=\"M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1\"/>"
};
  window.ICON = function (name, extra) {
    const body = PATHS[name] || '';
    return '<svg class="ico ico-' + name + (extra ? ' ' + extra : '') + '" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  };
})();
