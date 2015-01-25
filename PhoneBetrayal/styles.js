function fitVertical() {
    var sv = document.getElementById('style_view');
    var h = sv.clientHeight;
    var wh = window.innerHeight;
    sv.style.top = ((wh - h) / 2) + 'px';
}
var now = 0;
var MIN_TO_MILLI = 60 * 1000;
var DURATION = 0.5 * MIN_TO_MILLI; // minutes
var timer_displ;
var LAST_MIN = MIN_TO_MILLI;
function timeToString(minutes, seconds) {
    if (minutes < 10) {
        minutes = '0' + minutes;
    }
    if (seconds < 10) {
        seconds = '0' + seconds;
    }
    return minutes + ':' + seconds;
}
function timerTick() {
    var newNow = window.performance.now();
    var diff = newNow - now;
    var timerTime = DURATION - diff;
    var minutes = Math.floor(timerTime / MIN_TO_MILLI);
    var seconds = Math.floor((timerTime - minutes * MIN_TO_MILLI) / 1000);
    timer_displ.innerText = timeToString(minutes, seconds);
    if (minutes === 0) {
        timer_displ.className = 'timer_urgent';
        if (seconds < 20) {
            timer_displ.className = 'timer_urgent timer_blink';
        }
    }
    setTimeout(timerTick, 100);
}
function timer() {
    timer_displ = document.getElementById('timer_display');
    now = window.performance.now();
    timerTick();
}
//# sourceMappingURL=styles.js.map