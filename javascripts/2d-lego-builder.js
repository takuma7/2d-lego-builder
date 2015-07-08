document.oncontextmenu = document.body.oncontextmenu = function() {return false;};

// install paper.js object globally
paper.install(window);

// sounds
var clickSoundPlayer = new Audio('../audio/click.mp3');
var popSoundPlayer = new Audio('../audio/pop.mp3');
var whishSoundPlayer = new Audio('../audio/footstep.mp3');
var woobSoundPlayer = new Audio('../audio/woob.mp3');

function printError(message){
  console.error(message);
  woobSoundPlayer.play();
}

// general consts
var MESH_NUM_W= 30;
var MESH_NUM_H = 20;
var CONTROL_PANE_H = 300;

// style
var MESH_COLOR = '#696';
var MESH_SQUARE_DEFAULT_STYLE = Object.freeze({
  fillColor: new Color(0, 0, 0, 0)
  // fillColor: '#007B28'
});
var MESH_SQUARE_HOVER_STYLE = Object.freeze({
  fillColor: new Color(1, 1, 1, 0.2)
});
var DRAG_EMPTY_STYLE = Object.freeze({
  fillColor: '#555'
});
var DRAG_EMPTY_DANGER_STYLE = Object.freeze({
  fillColor: '#a55'
});
var DRAG_EMPTY_OPACITY = 0.7;
var BRICK_DEFAULT_STYLE = Object.freeze({
  fillColor: '#fff',
  strokeColor: '#000'
});
var BRICK_DISABLED_STYLE = Object.freeze({
  fillColor: new Color(1, 1, 1, 0.2),
  strokeColor: '#500'
});
var BRICK_MOUSE_ENTER_STYLE = Object.freeze({
  fillColor: '#fff',
  strokeColor: '#f00'
});
var BRICK_DEFAULT_OPACITY = 1.0;
var BRICK_DRAG_STYLE = Object.freeze({
  fillColor: '#fff',
  strokeColor: '#000'
});
var BRICK_DRAG_OPACITY = 0.5;
var BRICK_EMPTY_OPACITY = 0.5;
var UI_TEXT_COLOR = '#fff';
var UI_BUTTON_DEFAULT_STYLE = Object.freeze({
  fillColor: new Color(0.7, 0, 0),
  strokeColor: new Color(0.5, 0.5, 0.5)
});
var UI_BUTTON_HOVER_STYLE = Object.freeze({
  fillColor: new Color(1, 0, 0),
  strokeColor: new Color(0.5, 0.5, 0.5)
});
var UI_BUTTON_ACTIVE_STYLE = Object.freeze({
  fillColor: new Color(1, 0, 0),
  strokeColor: new Color(1, 1, 1)
});

// enums
var BrickStateEnum = Object.freeze({EMPTY: 0, LEFT_SIDE: 1,RIGHT_SIDE: 2, BODY: 3});
var BrickLength = Object.freeze([2, 3, 4, 6]);
var MouseClickButtonEnum = Object.freeze({LEFT: 0, RIGHT: 2});
var MaxBricksNum = Object.freeze({2:6, 3:6, 4:4, 6:4});
var currentBricksNum = {2:0, 3:0, 4:0, 6:0};
var controlBricks = {2:null, 3:null, 4:null, 6:null};
var controlBricksNum = {2:null, 3:null, 4:null, 6:null};

$(document).ready(function(){
  // setup canvas
  var canvas = document.getElementById('myCanvas');
  paper.setup(canvas);

  // setup layers
  var bgLayer = project.activeLayer;
  bgLayer.name = 'bg layer';
  var meshLayer = new Layer();
  meshLayer.name = 'mesh layer';
  var brickStudLayer = new Layer();
  brickStudLayer.name = 'brick stud layer';
  var brickBodyLayer = new Layer();
  brickBodyLayer.name = 'brick body layer';
  var overlayLayer = new Layer();
  overlayLayer.name = 'overlay layer';

  // setup global variables
  var bricksMap=[];
  var bricksConnection=[];
  var bricksConnectionNum = 0;
  var bricksConnectionStat;
  var maxBricksConnectionNum;
  for(var i=0; i < MESH_NUM_H; i++){
    bricksMap.push([]);
    bricksConnection.push([]);
    for(var j=0; j < MESH_NUM_W; j++){
      bricksMap[i].push(BrickStateEnum.EMPTY);
      bricksConnection[i].push(0);
    }
  }

  function calcMeshSize(){
    var w = $('#myCanvas').width() / MESH_NUM_W;
    var h = ($('#myCanvas').height()-CONTROL_PANE_H) / MESH_NUM_H;
    var l = Math.min(w, h);
    return l;
  }

  function drawUI(){
    var l = calcMeshSize();
    bgLayer.activate();
    // generate bricks
    var yOffsets = [-3, -5];
    controlBricks[2] = drawBrick(1, yOffsets[0], 2, true);
    controlBricks[3] = drawBrick(1, yOffsets[1], 3, true);
    controlBricks[4] = drawBrick(6, yOffsets[0], 4, true);
    controlBricks[6] = drawBrick(6, yOffsets[1], 6, true);
    // generate brikcs num indicator
    controlBricksNum[2] = new PointText({
      point: [3.5 * l, (MESH_NUM_H - yOffsets[0] -1)*l + l/2],
      content: 'x ' + (MaxBricksNum[2] - currentBricksNum[2]),
      fillColor: UI_TEXT_COLOR
    });
    controlBricksNum[3] = new PointText({
      point: [4.5 * l, (MESH_NUM_H - yOffsets[1] -1)*l + l/2],
      content: 'x ' + (MaxBricksNum[3] - currentBricksNum[3]),
      fillColor: UI_TEXT_COLOR
    });
    controlBricksNum[4] = new PointText({
      point: [10.5 * l, (MESH_NUM_H - yOffsets[0] -1)*l + l/2],
      content: 'x ' + (MaxBricksNum[4] - currentBricksNum[4]),
      fillColor: UI_TEXT_COLOR
    });
    controlBricksNum[6] = new PointText({
      point: [12.5 * l, (MESH_NUM_H - yOffsets[1] -1)*l + l/2],
      content: 'x ' + (MaxBricksNum[6] - currentBricksNum[6]),
      fillColor: UI_TEXT_COLOR
    });

    drawClearButton();
  }

  function drawClearButton(){
    var onMouseEnterFunc = function(event){
      this.children['rect'].style = UI_BUTTON_HOVER_STYLE;
    };
    var onMouseLeaveFunc = function(event){
      this.children['rect'].style = UI_BUTTON_DEFAULT_STYLE;
    };
    var onMouseDownFunc = function(event){
      this.children['rect'].style = UI_BUTTON_ACTIVE_STYLE;
    };
    var onMouseUpFunc = function(event){
      this.children['rect'].style = UI_BUTTON_HOVER_STYLE;
      brickBodyLayer.activate();
      brickBodyLayer.removeChildren();
      for(var y=0; y < MESH_NUM_H; y++){
        for(var x=0; x < MESH_NUM_W; x++){
          bricksMap[y][x] = BrickStateEnum.EMPTY;
        }
      }
      popSoundPlayer.play();
      update();
    };

    bgLayer.activate();
    var btn_width = 4;
    var l = calcMeshSize();
    var btn_x, btn_y, btn_w, btn_h;
    btn_x = (MESH_NUM_W - btn_width - 1)*l;
    btn_y = (MESH_NUM_H + 2)*l;
    btn_w = btn_width * l;
    btn_h = l;
    var clearButtonRect = new Path.Rectangle(btn_x, btn_y, btn_w, btn_h);
    clearButtonRect.name = 'rect';
    var clearButtonLabel = new PointText({
      point: [btn_x + btn_w/2, btn_y + btn_h / 2 + 5],
      content: 'Clear',
      justification: 'center',
      fillColor: 'white'
    });
    clearButtonLabel.name = 'label';
    var clearButton = new Group([clearButtonRect, clearButtonLabel]);
    clearButton.children['rect'].style = UI_BUTTON_DEFAULT_STYLE;
    clearButton.onMouseEnter = onMouseEnterFunc;
    clearButton.onMouseLeave = onMouseLeaveFunc;
    clearButton.onMouseDown = onMouseDownFunc;
    clearButton.onMouseUp = onMouseUpFunc;
  }

  function updateUI(){
    countCurrentBricksNum();
    BrickLength.forEach(function(elm, index){
      var left_num = MaxBricksNum[elm] - currentBricksNum[elm];
      controlBricksNum[elm].content = 'x ' + left_num;
      if(left_num === 0){
        controlBricks[elm].opacity = BRICK_EMPTY_OPACITY;
      }else{
        controlBricks[elm].opacity = BRICK_DEFAULT_OPACITY;
      }
    });
  }

  function drawMesh(){
    meshLayer.activate();
    var l = calcMeshSize();
    var onMouseEnterFunc = function(event){
      this.style = MESH_SQUARE_HOVER_STYLE;
    };
    var onMouseLeaveFunc = function(event){
      this.style = MESH_SQUARE_DEFAULT_STYLE;
    };

    for(var i=0; i< MESH_NUM_W; i++){
      for(var j=0; j< MESH_NUM_H; j++){
        var path = new Path.Rectangle(i*l, j*l, l, l);
        path.style = MESH_SQUARE_DEFAULT_STYLE;
        path.onMouseEnter = onMouseEnterFunc;
        path.onMouseLeave = onMouseLeaveFunc;
      }
    }

    for(var i=0; i <= MESH_NUM_W; i++){
      var path = new Path.Line(new Point(i*l, 0), new Point(i*l, l*MESH_NUM_H));
      path.strokeColor = MESH_COLOR;
    }
    for(var i=0; i <= MESH_NUM_H; i++){
      var path = new Path.Line(new Point(0, i*l), new Point(l*MESH_NUM_W, i*l));
      path.strokeColor = MESH_COLOR;
    }
  }

  function writeBrickInMap(x, y, size){
    if(size < 2) return;
    for(var i=x; i < x+size; i++){
      if(i == x ){
        bricksMap[y][i] = BrickStateEnum.LEFT_SIDE;
      }else if(i == x+size-1){
        bricksMap[y][i] = BrickStateEnum.RIGHT_SIDE;
      }else {
        bricksMap[y][i] = BrickStateEnum.BODY;
      }
    }
  }

  function removeBrickFromMap(x, y){
    console.log(x, y);
    if(bricksMap[y][x] == BrickStateEnum.EMPTY) return;
    for(var i=x; i >= 0; i--){
      if(bricksMap[y][i] == BrickStateEnum.LEFT_SIDE){
        bricksMap[y][i] = BrickStateEnum.EMPTY;
        break;
      }else if(bricksMap[y][i] == BrickStateEnum.BODY){
        bricksMap[y][i] = BrickStateEnum.EMPTY;
      }
    }
    for(var i=x; i < MESH_NUM_W; i++){
      if(bricksMap[y][i] == BrickStateEnum.RIGHT_SIDE){
        bricksMap[y][i] = BrickStateEnum.EMPTY;
        break;
      }else if(bricksMap[y][i] == BrickStateEnum.BODY){
        bricksMap[y][i] = BrickStateEnum.EMPTY;
      }
    }
  }

  function drawBricksFromMap(){
    brickBodyLayer.activate();
    brickBodyLayer.removeChildren();
    for(var i=0; i < MESH_NUM_H; i++){
      var size=0, x, y = i;
      for(var j=0; j < MESH_NUM_W; j++){
        if(size === 0 &&
           (bricksMap[i][j] == BrickStateEnum.LEFT_SIDE || bricksMap[i][j] == BrickStateEnum.RIGHT_SIDE)){
          size++;
          x = j;
        }else if(bricksMap[i][j] == BrickStateEnum.BODY){
          size++;
        }else if(bricksMap[i][j] == BrickStateEnum.LEFT_SIDE || bricksMap[i][j] == BrickStateEnum.RIGHT_SIDE){
          // should be SIDE
          size++;
          drawBrick(x, y, size);
          size = 0;
        }
      }
    }
  }

  function isBrickPlaceableTo(x, y, size, _x, _y, _size){
    if( x < 0 || x+size > MESH_NUM_W || y < 0 || y+size > MESH_NUM_H){
      console.error('out of bounds');
      return false;
    }
    for(var i=x; i < x+size; i++){
      if(bricksMap[y][i] != BrickStateEnum.EMPTY){
        if(_x !== undefined && _y !== undefined && _size !== undefined && y == _y && _x <= i && i < _x + _size){
            continue;
        }else{
          console.error('not placeable to (' + x + ', ' + y + ')');
          return false;
        }
      }
    }
    console.log('placeable to (' + x + ', ' + y + ')');
    return true;
  }

  function markConnection(){
    //initialize
    bricksConnectionStat = [];
    bricksConnectionNum = 0;
    for(var i=0; i < MESH_NUM_H; i++){
      for(var j=0; j < MESH_NUM_W; j++){
        bricksConnection[i][j] = 0;
      }
    }

    function _markConnection(x, y){
      if(x < 0 || x >= MESH_NUM_W || y < 0 || y >= MESH_NUM_H){
        return;
      }
      if(bricksMap[y][x] == BrickStateEnum.EMPTY || bricksConnection[y][x] !== 0){
        return;
      }
      bricksConnection[y][x] = bricksConnectionNum;
      if(bricksMap[y][x] != BrickStateEnum.LEFT_SIDE){
        _markConnection(x-1, y);
      }
      _markConnection(x, y-1);
      _markConnection(x, y+1);
      if(bricksMap[y][x] != BrickStateEnum.RIGHT_SIDE){
        _markConnection(x+1, y);
      }
    }

    for(var y=0; y < MESH_NUM_H; y++){
      for(var x=0; x < MESH_NUM_W; x++){
        if(bricksConnection[y][x] === 0 && bricksMap[y][x] != BrickStateEnum.EMPTY){
          bricksConnectionNum++;
          bricksConnectionStat.push(0);
          _markConnection(x, y);
        }
      }
    }

    // make stat
    for(var y=0; y < MESH_NUM_H; y++){
      for(var x=0; x < MESH_NUM_W; x++){
        if(bricksConnection[y][x] !== 0){
          bricksConnectionStat[bricksConnection[y][x] - 1]++;
        }
      }
    }
    maxBricksConnectionNum = 0;
    var maxStat = -1;
    for(var i=0; i < bricksConnectionNum; i++){
      if(bricksConnectionStat[i] > maxStat){
        maxStat = bricksConnectionStat[i];
        maxBricksConnectionNum = i+1; // to make 1 base, not 0
      }
    }
  }

  function moveBricksUp(){
    console.log('moving up');
    for(var x=0; x < MESH_NUM_W; x++){
      if(bricksMap[MESH_NUM_H - 1][x] != BrickStateEnum.EMPTY){
        printError('cannot move up any more');
        return false;
      }
    }
    for(var y=MESH_NUM_H - 1; y > 0; y--){
      for(var x=0; x < MESH_NUM_W; x++){
        bricksMap[y][x] = bricksMap[y-1][x];
      }
    }
    for(var x=0; x < MESH_NUM_W; x++){
      bricksMap[0][x] = BrickStateEnum.EMPTY;
    }
    return true;
  }
  function moveBricksDown(){
    console.log('moving down');
    for(var x=0; x < MESH_NUM_W; x++){
      if(bricksMap[0][x] != BrickStateEnum.EMPTY){
        printError('cannot move down any more');
        return false;
      }
    }
    for(var y=0; y < MESH_NUM_H - 1; y++){
      for(var x=0; x < MESH_NUM_W; x++){
        bricksMap[y][x] = bricksMap[y+1][x];
      }
    }
    for(var x=0; x < MESH_NUM_W; x++){
      bricksMap[MESH_NUM_H - 1][x] = BrickStateEnum.EMPTY;
    }
    return true;
  }
  function moveBricksLeft(){
    console.log('moving to left');
    for(var y=0; y < MESH_NUM_H; y++){
      if(bricksMap[y][0] != BrickStateEnum.EMPTY){
        printError('cannot move left any more');
        return false;
      }
    }
    for(var x=0; x < MESH_NUM_W - 1; x++){
      for(var y=0; y < MESH_NUM_H; y++){
        bricksMap[y][x] = bricksMap[y][x+1];
      }
    }
    for(var y=0; y < MESH_NUM_H; y++){
      bricksMap[y][MESH_NUM_W - 1] = BrickStateEnum.EMPTY;
    }
    return true;
  }
  function moveBricksRight(){
    console.log('moving to right');
    for(var y=0; y < MESH_NUM_H; y++){
      if(bricksMap[y][MESH_NUM_W - 1] != BrickStateEnum.EMPTY){
        printError('cannot move right any more');
        return false;
      }
    }
    for(var x=MESH_NUM_W - 1; x > 0; x--){
      for(var y=0; y < MESH_NUM_H; y++){
        bricksMap[y][x] = bricksMap[y][x-1];
      }
    }
    for(var y=0; y < MESH_NUM_H; y++){
      bricksMap[y][0] = BrickStateEnum.EMPTY;
    }
    return true;
  }

  var ar=new Array(33,34,35,36,37,38,39,40);

  $(document).on('keydown', function(event){
    console.log(event.keyCode);
    switch(event.keyCode){
      case 37:
        moveBricksLeft();
        update();
        break;
      case 38:
        moveBricksUp();
        update();
        break;
      case 39:
        moveBricksRight();
        update();
        break;
      case 40:
        moveBricksDown();
        update();
        break;
    }
    var key = event.which;
    //console.log(key);
    //if(key==35 || key == 36 || key == 37 || key == 39)
    if($.inArray(key,ar) > -1) {
      event.preventDefault();
      return false;
    }
  });

  function drawBricksMapValue(){
    overlayLayer.activate();
    overlayLayer.removeChildren();
    var l = calcMeshSize();
    for(var i=0; i < MESH_NUM_H; i++){
      for(var j=0; j < MESH_NUM_W; j++){
        var text = new PointText(new Point(j*l + l/2, (MESH_NUM_H - i - 1)*l + l/2));
        text.justification = 'center';
        text.fillColor = 'red';
        text.content = '' + bricksMap[i][j];
      }
    }
  }

  function drawBricksConnectionValue(){
    overlayLayer.activate();
    overlayLayer.removeChildren();
    var l = calcMeshSize();
    for(var i=0; i < MESH_NUM_H; i++){
      for(var j=0; j < MESH_NUM_W; j++){
        var text = new PointText(new Point(j*l + l/2, (MESH_NUM_H - i - 1)*l + l/2));
        text.justification = 'center';
        text.fillColor = 'red';
        text.content = '' + bricksConnection[i][j];
      }
    }
  }

  function drawBrick(x, y, size, isPlain){
    isPlain = typeof isPlain !== 'undefined' ? isPlain : false;
    // event handlers
    var onMouseEnterFunc = function(event){
      this.style = BRICK_MOUSE_ENTER_STYLE;
    };
    var onMouseLeaveFunc = function(event){
      this.style = this.default_style;
    };
    var onClickFunc = function(event){
      switch(event.event.button){
        case MouseClickButtonEnum.RIGHT:
          console.log(this);
          removeBrickFromMap(this.brickInfo.x, this.brickInfo.y);
          this.remove();
          popSoundPlayer.play();
          update();
          break;
        case MouseClickButtonEnum.LEFT:
          break;
        default:
          break;
      }
    };
    var dragOffset;
    var onMouseDownFunc = function(event){
      switch(event.event.button){
        case MouseClickButtonEnum.RIGHT:
          break;
        case MouseClickButtonEnum.LEFT:
          this.opacity = BRICK_DRAG_STYLE;
          this.opacity = BRICK_DRAG_OPACITY;
          dragOffset = new Point(event.point.x - this.position.x, event.point.y - this.position.y);
          this.bringToFront();
          break;
        default:
          break;
      }
    };
    var onMouseDragFunc = function(event){
      this.position = new Point(event.point.x - dragOffset.x, event.point.y - dragOffset.y);
    };
    var onMouseUpFunc = function(event){
      switch(event.event.button){
        case MouseClickButtonEnum.RIGHT:
          break;
        case MouseClickButtonEnum.LEFT:
          this.style = this.default_style;
          this.opacity = BRICK_DEFAULT_OPACITY;
          var x, y;
          var l = calcMeshSize();
          x = Math.round((this.position.x - this.bounds.width/2) / l);
          y = MESH_NUM_H - Math.floor(this.position.y / l) - 1;
          if(isBrickPlaceableTo(x, y, this.brickInfo.size, this.brickInfo.x, this.brickInfo.y, this.brickInfo.size)){
            removeBrickFromMap(this.brickInfo.x, this.brickInfo.y);
            writeBrickInMap(x, y, this.brickInfo.size);
          }
          clickSoundPlayer.play();
          update();
          break;
        default:
          break;
      }
    };

    // draw brick
    // brickStudLayer.activate();
    var l = calcMeshSize();
    var brickGroupArray = [];
    for(var i=0; i<size; i++){
      var path = new Path.Rectangle(i*l + l*0.2,
                                    - l*0.2,
                                    l*0.6,
                                    l*0.2
                                   );
      brickGroupArray.push(path);
    }
    if(isPlain){
      bgLayer.activate();
    }else{
      brickBodyLayer.activate();
    }
    var path = new Path.Rectangle(0, 0, l*size, l);
    brickGroupArray.push(path);
    var brickGroup = new Group(brickGroupArray);
    brickGroup.brickInfo = {x: x, y: y, size: size};
    if(isPlain){
      brickGroup.default_style = BRICK_DEFAULT_STYLE;
    }else{
      if(bricksConnection[y][x] == maxBricksConnectionNum){
        brickGroup.default_style = BRICK_DEFAULT_STYLE;
      }else{
        brickGroup.default_style = BRICK_DISABLED_STYLE;
      }
    }
    brickGroup.style = brickGroup.default_style;
    brickGroup.translate(x*l, (MESH_NUM_H-y-1)*l);
    if(!isPlain){
      brickGroup.onMouseEnter = onMouseEnterFunc;
      brickGroup.onMouseLeave = onMouseLeaveFunc;
      brickGroup.onClick = onClickFunc;
      brickGroup.onMouseUp = onMouseUpFunc;
      brickGroup.onMouseDrag = onMouseDragFunc;
      brickGroup.onMouseDown = onMouseDownFunc;
    }
    return brickGroup;
  }

  function countCurrentBricksNum(){
    var size = 0;
    currentBricksNum = {2:0, 3:0, 4:0, 6:0};
    for(var y=0; y < MESH_NUM_H; y++){
      for(var x=0; x < MESH_NUM_W; x++){
        switch(bricksMap[y][x]){
          case BrickStateEnum.LEFT_SIDE:
            size = 1;
            break;
          case BrickStateEnum.BODY:
            size++;
            break;
          case BrickStateEnum.RIGHT_SIDE:
            size++;
            currentBricksNum[size]++;
            break;
          default:
            break;
        }
      }
    }
  }

  var meshMousePoint = new Point();
  var meshDragPath;

  meshLayer.onMouseDown = function(event){
    var l = calcMeshSize();
    meshLayer.activate();
    meshMousePoint = event.point;
    if(meshDragPath)
      meshDragPath.remove();
    meshDragPath = new Path.Rectangle(Math.floor(event.point.x / l) * l,
                                      Math.floor(event.point.y / l) * l,
                                      l, l);
    meshDragPath.style = DRAG_EMPTY_STYLE;
    meshDragPath.brickInfo = {
      x: Math.floor(meshMousePoint.x / l),
      y: Math.floor(meshMousePoint.y / l),
      size: 1
    };
  };

  meshLayer.onMouseDrag = function(event){
    var l = calcMeshSize();
    meshLayer.activate();
    if(meshDragPath){
      meshDragPath.remove();
    }
    var dw = Math.floor(event.point.x / l) < Math.floor(meshMousePoint.x / l) ? l : 0;
    var width = (Math.floor(event.point.x / l) - Math.floor(meshMousePoint.x / l) + 1)*l - dw*2;
    var width_sign = width < 0 ? -1 : 1;
    var width_num = Math.round(Math.abs(width/l));
    if(width_num > Math.max.apply(null, BrickLength)){
      width_num = 6;
    }else{
      for(var i=0; i<BrickLength.length; i++){
        if(width_num == BrickLength[i]){
          break;
        }else{
          if(width_num > BrickLength[i]){
            continue;
          }else{
            if(i === 0){
              width_num = BrickLength[i];
            }else{
              width_num = ( width_num < (BrickLength[i-1]+BrickLength[i])/2) ? BrickLength[i-1] : BrickLength[i];
            }
            break;
          }
        }
      }
    }
    meshDragPath = new Path.Rectangle(
      Math.floor(meshMousePoint.x / l) * l + dw,
      Math.floor(meshMousePoint.y / l) * l,
      width_sign * width_num * l,
      l);
    meshDragPath.brickInfo = {
      x: width_sign > 0 ? Math.floor(meshMousePoint.x / l) : Math.floor(meshMousePoint.x / l) - width_num + 1,
      y: Math.floor(meshMousePoint.y / l),
      size: width_num
    };
    if(Math.floor(meshMousePoint.y / l) == Math.floor(event.point.y / l)){
      meshDragPath.style = DRAG_EMPTY_STYLE;
    }else{
      meshDragPath.style = DRAG_EMPTY_DANGER_STYLE;
    }
    meshDragPath.opacity = DRAG_EMPTY_OPACITY;
  };

  meshLayer.onMouseUp = function(event){
    var l = calcMeshSize();
    console.log(event);
    var x0 = Math.floor(event.point.x / l);
    var y0 = Math.floor(event.point.y / l);
    var x1 = Math.floor(meshMousePoint.x / l);
    var y1 = Math.floor(meshMousePoint.y / l);
    if(y0 != y1){
      printError('starting y and ending y not match');
      meshDragPath.remove();
      return;
    }
    var x = meshDragPath.brickInfo.x;
    var y = meshDragPath.brickInfo.y;
    var size = meshDragPath.brickInfo.size;
    if(MaxBricksNum[size] - currentBricksNum[size] > 0){
      whishSoundPlayer.play();
      writeBrickInMap(x, (MESH_NUM_H - y - 1), size);
    }else{
      printError('out of bricks: ' + size);
    }
    meshDragPath.remove();
    update();
  };

  brickBodyLayer.onMouseUp = function(event) {
    meshDragPath.remove();
    // update();
  };

  function update() {
    console.log('updated at', (new Date()).toLocaleTimeString());
    markConnection();
    drawBricksFromMap();
    updateUI();
    // drawBricksConnectionValue();
    // drawBricksMapValue();
  }

  drawMesh();
  drawUI();

  view.onFrame = function(event){
  };

  view.draw();
});
