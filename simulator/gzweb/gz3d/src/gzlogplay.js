var nsInSec = 1000000000;

/**
 * Correct the time so that small additions/substractions
 * preserve the internal seconds and nanoseconds separation
 * @param {} time - Time to be corrected
 */
var correctTime = function(time)
{
  var n = 0;
  // In the case sec and nsec have different signs, normalize
  if (time.sec > 0 && time.nsec < 0)
  {
    n = Math.floor(Math.abs(time.nsec / nsInSec) + 1);
    time.sec -= n;
    time.nsec += n * nsInSec;
  }
  if (time.sec < 0 && time.nsec > 0)
  {
    n = Math.floor(Math.abs(time.nsec / nsInSec) + 1);
    time.sec += n;
    time.nsec -= n * nsInSec;
  }

  // Make any corrections
  time.sec += Math.floor(time.nsec / nsInSec);
  time.nsec = Math.floor(time.nsec % nsInSec);
};


/*
 * Subtract time and preseve seconds and nanonsecods separation
 * @param {} timeA - Time being subtracted
 * @param {} timeB - Time to subtract
 */
var subtractTime = function(timeA, timeB)
{
  var result = {};
  result.sec = timeA.sec - timeB.sec;
  result.nsec = timeA.nsec - timeB.nsec;
  correctTime(result);
  return result;
};

/**
 * Provides an interface to control a running log playback. It sends events to
 * GzIface and updates some UI elements.
 * @constructor
 */
GZ3D.LogPlay = function()
{
  this.emitter = globalEmitter || new EventEmitter2({verboseMemoryLeak: true});
  this.visible = null;
  this.startTime = null;
  this.endTime = null;
  this.active = false;
  this.sliderRange = 100;
  this.visible = false;

  var that = this;

  // when slide pos changes
  this.emitter.on('logPlaySlideStop', function (value)
    {
      if (!that.startTime || !that.endTime)
      {
        return;
      }

      var rel = value / that.sliderRange;
      var seek = (that.startTime.sec + that.startTime.nsec * 1e-9) +
        rel * (that.totalTime.sec + that.totalTime.nsec * 1e-9);

      var playback = {};
      playback.seek = {};
      playback.seek.sec = Math.floor(seek);
      playback.seek.nsec = Math.round((seek - playback.seek.sec) * nsInSec);

      // publich playback control command msg
      that.emitter.emit('logPlayChanged', playback);
      that.active = false;
    }
  );

  this.emitter.on('logPlaySlideStart', function ()
    {
      that.active = true;
    }
  );

  this.emitter.on('logPlayRewind', function ()
    {
      var playback = {};
      playback.rewind = true;
      that.emitter.emit('logPlayChanged', playback);
    }
  );
  this.emitter.on('logPlayForward', function ()
    {
      var playback = {};
      playback.forward = true;
      that.emitter.emit('logPlayChanged', playback);
    }
  );
  this.emitter.on('logPlayStepforward', function ()
    {
      var playback = {};
      playback.multi_step = 1;
      that.emitter.emit('logPlayChanged', playback);
    }
  );
  this.emitter.on('logPlayStepback', function ()
    {
      var playback = {};
      playback.multi_step = -1;
      that.emitter.emit('logPlayChanged', playback);
    }
  );
  this.emitter.on('paused', function (paused)
    {
      if (paused)
      {
        $('#logplay-playText').html(
            '<img style="height:1.2em" src="style/images/play.png" ' +
            'title="Play">');
      }
      else
      {
        $('#logplay-playText').html(
            '<img style="height:1.2em" src="style/images/pause.png" ' +
            'title="Pause">');
      }
    }
  );
};

/**
 * get log playback widget visibility
 */
GZ3D.LogPlay.prototype.isVisible = function()
{
  return this.visible;
};

/**
 * Set log playback widget visibility
 */
GZ3D.LogPlay.prototype.setVisible = function(visible)
{
  if (visible === this.visible)
  {
    return;
  }
  this.visible = visible;

  if (this.visible)
  {
    $('#logplay').show();
  }
  else
  {
    $('#logplay').hide();
  }
};

/**
 * Set log playback stats based on data received
 */
GZ3D.LogPlay.prototype.setStats = function(simTime, startTime, endTime)
{
  this.simTime = simTime;

  if (!this.startTime || !this.endTime || !this.totalTime ||
      this.startTime.sec !== startTime.sec ||
      this.startTime.nsec !== startTime.nsec ||
      this.endTime.sec !== endTime.sec ||
      this.endTime.nsec !== endTime.nsec)
  {
    this.startTime = startTime;
    this.endTime = endTime;
    this.totalTime = subtractTime(endTime, startTime);
  }

  if (!this.active)
  {
    // work out new slider value to set to
    var relTime = subtractTime(this.simTime, this.startTime);
    var newVal = (relTime.sec + relTime.nsec * 1e-9) /
        (this.totalTime.sec + this.totalTime.nsec * 1e-9);
    newVal = Math.max(newVal, 0);

    // slider range: 0 - 100
    $('#logplay-slider-input').val(newVal*this.sliderRange).slider('refresh');
    $('#logplay-slider-input').text(newVal*this.sliderRange).slider('refresh');
  }
};
