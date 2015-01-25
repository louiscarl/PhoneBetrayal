function fitVertical() {
    var sv = document.getElementById('style_view');
    var h = sv.clientHeight;
    var wh = window.innerHeight;
    sv.style.top = ((wh - h) / 2) + 'px';
}
var timerStart = 0;
var durationInSeconds = 0;
var SEC_TO_MILLI = 1000;
var MIN_TO_MILLI = 60 * 1000;
var timer_displ;
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
    var diff = newNow - timerStart;
    var timerTime = (durationInSeconds * SEC_TO_MILLI) - diff;
    if (timerTime < 0) {
        timerTime = 0;
    }
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
function startRoundTimer(duration) {
    timer_displ = document.getElementById('timer_display');
    timerStart = window.performance.now();
    durationInSeconds = duration;
    timerTick();
}
//# sourceMappingURL=styles.js.map