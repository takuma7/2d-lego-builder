document.oncontextmenu = document.body.oncontextmenu = function() {return false;};

// install paper.js object globally
paper.install(window);

// general consts
var MESH_NUM_W= 30;
var MESH_NUM_H = 20;

// style
var MESH_COLOR = '#666';
var DRAG_EMPTY_STYLE = Object.freeze({
  fillColor: '#555'
});
var DRAG_EMPTY_DANGER_STYLE = Object.freeze({
  fillColor: '#a55'
});
var DRAG_EMPTY_OPACITY = 0.5;
var BRICK_DEFAULT_STYLE = Object.freeze({
  fillColor: '#fff',
  strokeColor: '#000'
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

// enums
var BrickStateEnum = Object.freeze({EMPTY: 0, LEFT_SIDE: 1,RIGHT_SIDE: 2, BODY: 3});
var BrickLength = Object.freeze([2, 3, 4, 6]);
var MouseClickButtonEnum = Object.freeze({LEFT: 0, RIGHT: 2});

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
  for(var i=0; i < MESH_NUM_H; i++){
    bricksMap.push([]);
    for(var j=0; j < MESH_NUM_W; j++){
      bricksMap[i].push(BrickStateEnum.EMPTY);
    }
  }

  function calcMeshSize(){
    var w = $('#myCanvas').width() / MESH_NUM_W;
    var h = $('#myCanvas').height() / MESH_NUM_H;
    var l = Math.min(w, h);
    return l;
  }

  function drawMesh(){
    meshLayer.activate();
    var l = calcMeshSize();
    var onMouseEnterFunc = function(event){
      this.fillColor = '#222';
    };
    var onMouseLeaveFunc = function(event){
      this.fillColor = 'black';
    };

    for(var i=0; i< MESH_NUM_W; i++){
      for(var j=0; j< MESH_NUM_H; j++){
        var path = new Path.Rectangle(i*l, j*l, l, l);
        path.fillColor = 'black';
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
    for(var i=x; i < x+size; i++){
      if(bricksMap[y][i] != BrickStateEnum.EMPTY){
        if(_x !== undefined && _y !== undefined && _size !== undefined && y == _y && _x <= i && i < _x + _size){
            continue;
        }else{
          console.log('not placeable to (' + x + ', ' + y + ')');
          return false;
        }
      }
    }
    console.log('placeable to (' + x + ', ' + y + ')');
    return true;
  }

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

  function drawBrick(x, y, size){
    // event handlers
    var onMouseEnterFunc = function(event){
      this.style = BRICK_MOUSE_ENTER_STYLE;
    };
    var onMouseLeaveFunc = function(event){
      this.style = BRICK_DEFAULT_STYLE;
    };
    var onClickFunc = function(event){
      switch(event.event.button){
        case MouseClickButtonEnum.RIGHT:
          console.log(this);
          removeBrickFromMap(this.brickInfo.x, this.brickInfo.y);
          this.remove();
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
      this.opacity = BRICK_DRAG_STYLE;
      this.opacity = BRICK_DRAG_OPACITY;
      // console.log(this.position.x);
      // console.log(event.point.x);
      dragOffset = new Point(event.point.x - this.position.x, event.point.y - this.position.y);
      // console.log(dragOffset);
    };
    var onMouseDragFunc = function(event){
      this.position = new Point(event.point.x - dragOffset.x, event.point.y - dragOffset.y);
    };
    var onMouseUpFunc = function(event){
      this.style = BRICK_DEFAULT_STYLE;
      this.opacity = BRICK_DEFAULT_OPACITY;
      var x, y;
      var l = calcMeshSize();
      x = Math.round((this.position.x - this.bounds.width/2) / l);
      y = MESH_NUM_H - Math.floor(this.position.y / l) - 1;
      if(isBrickPlaceableTo(x, y, this.brickInfo.size, this.brickInfo.x, this.brickInfo.y, this.brickInfo.size)){
        removeBrickFromMap(this.brickInfo.x, this.brickInfo.y);
        writeBrickInMap(x, y, this.brickInfo.size);
      }
      update();
    };

    // draw brick
    brickStudLayer.activate();
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
    brickBodyLayer.activate();
    var path = new Path.Rectangle(0, 0, l*size, l);
    brickGroupArray.push(path);
    var brickGroup = new Group(brickGroupArray);
    brickGroup.brickInfo = {x: x, y: y, size: size};
    brickGroup.style = BRICK_DEFAULT_STYLE;
    brickGroup.translate(x*l, (MESH_NUM_H-y-1)*l);
    brickGroup.onMouseEnter = onMouseEnterFunc;
    brickGroup.onMouseLeave = onMouseLeaveFunc;
    brickGroup.onClick = onClickFunc;
    brickGroup.onMouseUp = onMouseUpFunc;
    brickGroup.onMouseDrag = onMouseDragFunc;
    brickGroup.onMouseDown = onMouseDownFunc;
    return brickGroup;
  }

  var meshMousePoint = new Point();
  var meshDragPath;

  meshLayer.onMouseDown = function(event){
    var l = calcMeshSize();
    meshLayer.activate();
    meshMousePoint = event.point;
    meshDragPath = new Path.Rectangle(Math.floor(event.point.x / l) * l,
                                      Math.floor(event.point.y / l) * l,
                                      l, l);
    meshDragPath.style = DRAG_EMPTY_STYLE;
  };

  meshLayer.onMouseDrag = function(event){
    var l = calcMeshSize();
    meshLayer.activate();
    meshDragPath.remove();
    var dw = Math.floor(event.point.x / l) < Math.floor(meshMousePoint.x / l) ? l : 0;
    meshDragPath = new Path.Rectangle(Math.floor(meshMousePoint.x / l) * l + dw,
                                      Math.floor(meshMousePoint.y / l) * l,
                                      (Math.floor(event.point.x / l) - Math.floor(meshMousePoint.x / l) + 1)*l - dw*2,
                                      l);
    if(Math.floor(meshMousePoint.y / l) == Math.floor(event.point.y / l)){
      meshDragPath.style = DRAG_EMPTY_STYLE;
    }else{
      meshDragPath.style = DRAG_EMPTY_DANGER_STYLE;
    }
    meshDragPath.opacity = DRAG_EMPTY_OPACITY;
  };

  meshLayer.onMouseUp = function(event){
    meshDragPath.remove();
    var l = calcMeshSize();
    // console.log(event);
    var x0 = Math.floor(event.point.x / l);
    var y0 = Math.floor(event.point.y / l);
    var x1 = Math.floor(meshMousePoint.x / l);
    var y1 = Math.floor(meshMousePoint.y / l);
    if(y0 != y1) return;
    var x = Math.min(x0, x1);
    var y = y0;
    var size = Math.max(x0, x1) - x + 1;
    writeBrickInMap(x, (MESH_NUM_H - y - 1), size);
    update();
  };

  brickBodyLayer.onMouseUp = function(event) {
    meshDragPath.remove();
    // update();
  };

  function update() {
    console.log('updated at', (new Date()).toLocaleTimeString());
    drawBricksFromMap();
    // drawBricksMapValue();
  }

  drawMesh();

  view.onFrame = function(event){
  };

  view.draw();
});
