// https://github.com/superguigui/simple-color-picker 魔改
// import { EventBus } from '../index';
import { CHANGE_COLOR } from '../events-type';
import tinycolor from 'tinycolor2';
import Component from '../component';
const isNumber = val => (typeof val === 'number' || val instanceof Number);


/* =============================================================================
  Helper functions
============================================================================= */
function clamp (value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getMousePosition (e) {
  e = (e.type.indexOf('touch') === 0) ? e.touches[ 0 ] : e;
  return {
    x : e.clientX,
    y : e.clientY
  };
}

function numberToHex (color) {
  return '#' + ('00000' + (color | 0).toString(16)).substr(-6);
}

/**
 * Creates a new SimpleColorPicker
 * @param {Object} options
 * @param {String|Number|Object} options.color The default color that the picker will display. Default is #FFFFFF. It can be a hexadecimal number or an hex String.
 * @param {String|Number|Object} options.background The background color of the picker. Default is transparent. It can be a hexadecimal number or an hex String.
 * @param {HTMLElement} options.el A dom node to add the picker to. You can also use `colorPicker.appendTo(domNode)` afterwards if you prefer.
 * @param {Number} options.width Desired width of the color picker. Default is 175.
 * @param {Number} options.height Desired height of the color picker. Default is 150.
 */
class SimpleColorPicker extends Component {
  constructor(parent, options = {}) {
    super(parent, options);
    // Properties
    this.color = null;
    this.width = 0;
    this.widthUnits = 'px';
    this.height = 0;
    this.heightUnits = 'px';
    this.hue = 0;
    this.position = { x : 0, y : 0 };
    this.huePosition = 0;
    this.saturationWidth = 0;
    this.hueHeight = 0;
    this.maxHue = 0;
    this.inputIsNumber = false;

    // Bind methods to scope (if needed)
    this._onSaturationMouseDown = this._onSaturationMouseDown.bind(this);
    this._onSaturationMouseMove = this._onSaturationMouseMove.bind(this);
    this._onSaturationMouseUp = this._onSaturationMouseUp.bind(this);
    this._onHueMouseDown = this._onHueMouseDown.bind(this);
    this._onHueMouseMove = this._onHueMouseMove.bind(this);
    this._onHueMouseUp = this._onHueMouseUp.bind(this);

    // Register window and document references in case this is instantiated inside of an iframe
    this.window = options.window || window;
    this.document = this.window.document;

    // Create DOM
    this.$el = this.document.createElement('div');
    this.$el.className = 'wechat-picker';
    this.$el.innerHTML = `
      <div class="wechat-picker-saturation">
        <div class="wechat-picker-brightness"></div>
        <div class="wechat-picker-sbSelector"></div>
      </div>
      <div class="wechat-picker-hue">
        <div class="wechat-picker-hSelector"></div>
      </div>`;

    // DOM accessors
    this.$saturation = this.$el.querySelector('.wechat-picker-saturation');
    this.$hue = this.$el.querySelector('.wechat-picker-hue');
    this.$sbSelector = this.$el.querySelector('.wechat-picker-sbSelector');
    this.$hSelector = this.$el.querySelector('.wechat-picker-hSelector');

    // Event listeners
    this.$saturation.addEventListener('mousedown', this._onSaturationMouseDown);
    this.$saturation.addEventListener('touchstart', this._onSaturationMouseDown);
    this.$hue.addEventListener('mousedown', this._onHueMouseDown);
    this.$hue.addEventListener('touchstart', this._onHueMouseDown);

    // Some styling and DOMing from options
    if ( options.el ) {
      this.appendTo(options.el);
    }
    if ( options.background ) {
      this.setBackgroundColor(options.background);
    }
    if ( options.widthUnits ) {
      this.widthUnits = options.widthUnits;
    }
    if ( options.heightUnits ) {
      this.heightUnits = options.heightUnits;
    }
    this.setSize(options.width || 220, options.height || 150);
    this.setColor(options.color);
    this.on(CHANGE_COLOR, options.onChange || function() {});
    return this;
  }


  /* =============================================================================
    Public API
  ============================================================================= */
  /**
   * Add the SimpleColorPicker instance to a DOM element.
   * @param  {HTMLElement} el
   * @return {SimpleColorPicker} Returns itself for chaining purpose
   */
  appendTo(el) {
    if ( typeof el === 'string' ) {
      document.querySelector(el).appendChild(this.$el);
    } else {
      el.appendChild(this.$el);
    }
    return this;
  };

  /**
   * Removes picker from its parent and kill all listeners.
   * Call this method for proper destroy.
   */
  remove() {
    this._onSaturationMouseUp();
    this._onHueMouseUp();

    this.$saturation.removeEventListener('mousedown', this._onSaturationMouseDown);
    this.$saturation.removeEventListener('touchstart', this._onSaturationMouseDown);
    this.$hue.removeEventListener('mousedown', this._onHueMouseDown);
    this.$hue.removeEventListener('touchstart', this._onHueMouseDown);

    if ( this.$el.parentNode ) {
      this.$el.parentNode.removeChild(this.$el);
    }
  };

  /**
   * Manually set the current color of the picker. This is the method
   * used on instantiation to convert `color` option to actual color for
   * the picker. Param can be a hexadecimal number or an hex String.
   * @param {String|Number} color hex color desired
   * @return {SimpleColorPicker} Returns itself for chaining purpose
   */
  setColor(color) {
    if ( isNumber(color) ) {
      this.inputIsNumber = true;
      color = numberToHex(color);
    } else {
      this.inputIsNumber = false;
    }
    this.color = tinycolor(color);

    const hsvColor = this.color.toHsv();

    if ( !isNaN(hsvColor.h) ) {
      this.hue = hsvColor.h;
    }

    this._moveSelectorTo(this.saturationWidth * hsvColor.s, (1 - hsvColor.v) * this.hueHeight);
    // this._moveHueTo((1 - (this.hue / 360)) * this.hueHeight);

    this._updateHue();
    return this;
  };

  /**
   * Set size of the color picker for a given width and height. Note that
   * a padding of 5px will be added if you chose to use the background option
   * of the constructor.
   * @param {Number} width
   * @param {Number} height
   * @return {SimpleColorPicker} Returns itself for chaining purpose
   */
  setSize(width, height) {
    this.width = width;
    this.height = height;
    this.$el.style.width = this.width + this.widthUnits;
    this.$el.style.height = this.height + this.heightUnits;

    this.saturationWidth = this.width - 30;
    this.$saturation.style.width = this.saturationWidth + 'px';

    this.hueHeight = this.height;
    this.maxHue = this.hueHeight - 2;

    return this;
  };

  /**
   * Set the background color of the picker. It also adds a 5px padding
   * for design purpose.
   * @param {String|Number} color hex color desired for background
   * @return {SimpleColorPicker} Returns itself for chaining purpose
   */
  setBackgroundColor(color) {
    if ( isNumber(color) ) {
      color = numberToHex(color);
    }
    // this.$el.style.padding = '5px';
    this.$el.style.background = tinycolor(color).toHexString();
    return this;
  };

  /**
   * Removes background of the picker if previously set. It's no use
   * calling this method if you didn't set the background option on start
   * or if you didn't call setBackgroundColor previously.
   */
  setNoBackground() {
    this.$el.style.padding = '0px';
    this.$el.style.background = 'none';
  };

  /**
   * Registers callback to the update event of the picker.
   * picker inherits from [component/emitter](https://github.com/component/emitter)
   * so you could do the same thing by calling `colorPicker.on('update');`
   * @param  {Function} callback
   * @return {SimpleColorPicker} Returns itself for chaining purpose
   */
  onChange() {
    this.emit(CHANGE_COLOR, this.getHexString());
    return this;
  };

  /* =============================================================================
    Color getters
  ============================================================================= */
  /**
   * Main color getter, will return a formatted color string depending on input
   * or a number depending on the last setColor call.
   * @return {Number|String}
   */
  getColor() {
    if ( this.inputIsNumber ) {
      return this.getHexNumber();
    }
    return this.color.toString();
  };

  /**
   * Returns color as css hex string (ex: '#FF0000').
   * @return {String}
   */
  getHexString() {
    return this.color.toHexString().toUpperCase();
  };

  /**
   * Returns color as number (ex: 0xFF0000).
   * @return {Number}
   */
  getHexNumber() {
    return parseInt(this.color.toHex(), 16);
  };

  /**
   * Returns color as {r: 255, g: 0, b: 0} object.
   * @return {Object}
   */
  getRGB() {
    return this.color.toRgb();
  };

  /**
   * Returns color as {h: 100, s: 1, v: 1} object.
   * @return {Object}
   */
  getHSV() {
    return this.color.toHsv();
  };

  /**
   * Returns true if color is perceived as dark
   * @return {Boolean}
   */
  isDark() {
    return this.color.isDark();
  };

  /**
   * Returns true if color is perceived as light
   * @return {Boolean}
   */
  isLight() {
    return this.color.isLight();
  };

  /* =============================================================================
    "Private" methods
  ============================================================================= */
  _moveSelectorTo(x, y) {
    this.position.x = clamp(x, 0, this.saturationWidth);
    this.position.y = clamp(y, 0, this.hueHeight);
    this.$sbSelector.style.webkitTransform = `translate3d(${this.position.x}px, ${this.position.y}px, 0)`;

  };

  _updateColorFromPosition() {
    this.color = tinycolor({
      h : this.hue,
      s : this.position.x / this.saturationWidth,
      v : 1 - (this.position.y / this.hueHeight)
    });
    this._updateColor();
  };

  _moveHueTo(y) {
    this.huePosition = clamp(y, 0, this.maxHue);
    this.$hSelector.style.webkitTransform = `translate3d(0,${this.huePosition}px, 0)`;

  };

  _updateHueFromPosition() {
    const hsvColor = this.color.toHsv();
    this.hue = 360 * (1 - (this.huePosition / this.maxHue));
    this.color = tinycolor({ h : this.hue, s : hsvColor.s, v : hsvColor.v });
    this._updateHue();
  };

  _updateHue() {
    const hueColor = tinycolor({ h : this.hue, s : 1, v : 1 });
    this.$saturation.style.background = `linear-gradient(to right, #fff, ${hueColor.toHexString()})`;
    this._updateColor();
  };

  _updateColor() {
    this.$sbSelector.style.background = this.color.toHexString();
    this.$sbSelector.style.borderColor = this.color.isDark() ? '#fff' : '#000';
    this.emit(CHANGE_COLOR, this.color.toHexString());
  };

  /* =============================================================================
    Events handlers
  ============================================================================= */
  _onSaturationMouseDown(e) {
    const sbOffset = this.$saturation.getBoundingClientRect();
    const xPos = getMousePosition(e).x;
    const yPos = getMousePosition(e).y;
    this._moveSelectorTo(xPos - sbOffset.left, yPos - sbOffset.top);
    this._updateColorFromPosition();
    this.window.addEventListener('mouseup', this._onSaturationMouseUp);
    this.window.addEventListener('touchend', this._onSaturationMouseUp);
    this.window.addEventListener('mousemove', this._onSaturationMouseMove);
    this.window.addEventListener('touchmove', this._onSaturationMouseMove);
    e.preventDefault();
  };

  _onSaturationMouseMove(e) {
    const sbOffset = this.$saturation.getBoundingClientRect();
    const xPos = getMousePosition(e).x;
    const yPos = getMousePosition(e).y;
    this._moveSelectorTo(xPos - sbOffset.left, yPos - sbOffset.top);
    this._updateColorFromPosition();
  };

  _onSaturationMouseUp() {
    this.window.removeEventListener('mouseup', this._onSaturationMouseUp);
    this.window.removeEventListener('touchend', this._onSaturationMouseUp);
    this.window.removeEventListener('mousemove', this._onSaturationMouseMove);
    this.window.removeEventListener('touchmove', this._onSaturationMouseMove);
  };

  _onHueMouseDown(e) {
    const hOffset = this.$hue.getBoundingClientRect();
    const yPos = getMousePosition(e).y;
    this._moveHueTo(yPos - hOffset.top);
    this._updateHueFromPosition();
    this.window.addEventListener('mouseup', this._onHueMouseUp);
    this.window.addEventListener('touchend', this._onHueMouseUp);
    this.window.addEventListener('mousemove', this._onHueMouseMove);
    this.window.addEventListener('touchmove', this._onHueMouseMove);
    e.preventDefault();
  };

  _onHueMouseMove(e) {
    const hOffset = this.$hue.getBoundingClientRect();
    const yPos = getMousePosition(e).y;
    this._moveHueTo(yPos - hOffset.top);
    this._updateHueFromPosition();
  };

  _onHueMouseUp() {
    this.window.removeEventListener('mouseup', this._onHueMouseUp);
    this.window.removeEventListener('touchend', this._onHueMouseUp);
    this.window.removeEventListener('mousemove', this._onHueMouseMove);
    this.window.removeEventListener('touchmove', this._onHueMouseMove);
  };


}

export default SimpleColorPicker;
