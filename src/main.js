// Import the cocos2d module
var cocos = require('cocos2d'),
// Import the geometry module
    geo = require('geometry'),
// Import box2d Physics Engine
    box2d = require('box2d');

var PTM_RATIO = 30;

var TAGS = {
  kTagPaddle        : "Paddle",
  kTagPuck          : "Puck",
  kTagBlueGoal      : "Blue Goal",
  kTagRedGoal       : "Red Goal",
  kTagRedScore      : "Red Score",
  kTagBlueScore     : "Blue Score",
  kTagPlayButton    : "Play Button",
  kTagRematchButton : "Rematch Button"
}

var COLORS = {
  red : "red",
  blue : "blue"
}

var Splash = cocos.nodes.Layer.extend( {
  init : function() {
    Splash.superclass.init.call( this );

    this.set( "isMouseEnabled", true );

    var director = cocos.Director.get( "sharedDirector" );
    var winSize = director.get( "winSize" );

    var titleSplash = cocos.nodes.Sprite.create( { file : "/resources/titleSplash.png" } );
    titleSplash.set( "position", new geo.Point( winSize.width / 2, winSize.height * 4 / 5 ) );
    this.addChild( { child : titleSplash, z : 100 } );

    var playButton = cocos.nodes.Sprite.create( { file : "/resources/playButton.png" } );
    playButton.set( "position", new geo.Point( winSize.width / 2, winSize.height / 5 ) );
    this.addChild( { child : playButton, z : 100, tag : TAGS.kTagPlayButton } );


    playButton.push = function() {
      console.log( "PLAY" );
      director.pushScene( Hockey.create() );
    }

    var background = cocos.nodes.Sprite.create( { file : "/resources/screenshot.png" } );
    background.set( "position", new geo.Point( winSize.width / 2, winSize.height / 2 ) );
    this.addChild( { child : background, z : -1 } );
  },

  mouseDown : function( evt ) {
    var pos        = evt.locationInCanvas,
        playButton = this.getChild( { tag : TAGS.kTagPlayButton } );

    if( geo.rectContainsPoint( playButton.get( "rect" ), pos ) ) {
      playButton.push();
    }
  }
} );

var Rematch = cocos.nodes.Layer.extend( {
  init : function( winner ) {
    Rematch.superclass.init.call( this );

    this.set( "isMouseEnabled", true );

    var director = cocos.Director.get( "sharedDirector" );
    var winSize  = director.get( "winSize" );

    var background = cocos.nodes.Sprite.create( { file : "/resources/screenshot.png" } );
    background.set( "position", new geo.Point( winSize.width / 2, winSize.height / 2 ) );
    this.addChild( { child : background, z : -1 } );

    var winnerImagePath;
    if( winner == COLORS.blue ) {
      winnerImagePath = "/resources/bluePlayerWins.png";
    } else if( winner == COLORS.red ) {
      winnerImagePath = "/resources/redPlayerWins.png";
    }

    var playerWins = cocos.nodes.Sprite.create( { file : winnerImagePath } );
    playerWins.set( "position", new geo.Point( winSize.width / 2, winSize.height * 4 / 5 ) );
    this.addChild( { child : playerWins, z : 100 } );

    var rematchButton = cocos.nodes.Sprite.create( { file : "/resources/rematchButton.png" } );
    rematchButton.set( "position", new geo.Point( winSize.width / 2, winSize.height / 5 ) );
    this.addChild( { child : rematchButton, z : 100, tag : TAGS.kTagRematchButton } );

    rematchButton.push = function() {
      console.log( "Rematch" );
      director.pushScene( Hockey.create() );
    }
  },
  mouseDown : function( evt ) {
    var pos        = evt.locationInCanvas,
        rematchButton = this.getChild( { tag : TAGS.kTagRematchButton } );

    if( geo.rectContainsPoint( rematchButton.get( "rect" ), pos ) ) {
      rematchButton.push();
    }
  }
} );

// Create a new layer
var Hockey = cocos.nodes.Layer.extend({
    world: null,
    bodies: null,
    selectedBody: null,
    mouseJoint: null,
    contactListener : null,
    puckBody : null,
    redPaddleBody : null,
    bluePaddleBody : null,
    sounds : null,

    init: function() {
        // You must always call the super class version of init
        Hockey.superclass.init.call(this);

        this.set('isMouseEnabled', true);

        this.set('bodies', []);
        this.set( "sounds", {
          goalScore     : new Audio( "goalScore.wav" ),
          puckHitPaddle : new Audio( "puckHitPaddle.wav" ),
          puckHitWall   : new Audio( "puckHitWall.wav" ),
          buzzer        : new Audio( "buzzer.wav" ),
          winner        : new Audio( "winner.wav" )
        } );

        // Get size of canvas
        var s = cocos.Director.get('sharedDirector').get('winSize');

        this.play();
        this.scheduleUpdate();
    },

    playSound : function( sound ) {
      this.get( "sounds" )[ sound ].play();
    },

    update: function(dt) {
        var world = this.get('world'),
            mouseJoint = this.get('mouseJoint');

        world.Step(dt, 10, 10);
        //world.DrawDebugData();
        world.ClearForces();

        var listener = this.get( "contactListener" );

        if( listener.puckHitPaddle ) {
          this.playSound( "puckHitPaddle" );
          listener.puckHitPaddle = false;
        }

        if( listener.puckHitWall ) {
          this.playSound( "puckHitWall" );
          listener.puckHitWall = false;
        }

        if( listener.redJustScored || listener.blueJustScored ) {
          var winSize = cocos.Director.get( "sharedDirector" ).get( "winSize" ),
              midx    = (winSize.width / 2) / PTM_RATIO;
              puckBody       = this.get( "puckBody" ),
              bluePaddleBody = this.get( "bluePaddleBody" ),
              redPaddleBody  = this.get( "redPaddleBody" );

          this.playSound( "buzzer" );

          var score;
          var winner;
          if( listener.redJustScored ) {
            winner = COLORS.red;
            puckBodyY = winSize.height * 2/3;
            var redScore = this.getChild( { tag : TAGS.kTagRedScore } );
            score    = 1 + parseInt( redScore.get( "string" ) );

            redScore.set( "string", score );
          } else {
            winner = COLORS.blue;
            puckBodyY = winSize.height / 3;
            var blueScore = this.getChild( { tag : TAGS.kTagBlueScore } );
            score    = 1 + parseInt( blueScore.get( "string" ) );

            blueScore.set( "string", score );
          }

          puckBody.SetLinearVelocity( new box2d.b2Vec2( 0, 0 ) );
          puckBody.SetPosition( new box2d.b2Vec2( midx, puckBodyY / PTM_RATIO ) );

          bluePaddleBody.SetLinearVelocity( new box2d.b2Vec2( 0, 0 ) );
          bluePaddleBody.SetPosition( new box2d.b2Vec2( midx, (winSize.height * 4 / 5) / PTM_RATIO ) );

          redPaddleBody.SetLinearVelocity( new box2d.b2Vec2( 0, 0 ) );
          redPaddleBody.SetPosition( new box2d.b2Vec2( midx, (winSize.height / 5) / PTM_RATIO ) );

          this.mouseUp({});

          listener.redJustScored = false;
          listener.blueJustScored = false;

          this.playSound( "goalScore" );

          if( score == 5 ) {
            this.playSound( "winner" );
            console.log( "Game Over" );
            var director = cocos.Director.get( "sharedDirector" );
            director.pushScene( Rematch.create( winner ) );
          }
        }

        var bodies = this.get('bodies');
        for (var i = 0, len = bodies.length; i < len; i++) {
            var body = bodies[i],
                pos = body.GetPosition(),
                angle = geo.radiansToDegrees(body.GetAngle());
            body.sprite.set('position', new geo.Point(pos.x * PTM_RATIO, pos.y * PTM_RATIO));
            body.sprite.set('rotation', angle);
        }
    },

    play: function() {
        var world = new box2d.b2World(
            new box2d.b2Vec2(0, 0),
            true                  //allow sleep
        );
        this.set('world', world);

        var listener = new box2d.b2ContactListener();
        listener.redJustScored = false;
        listener.blueJustScored = false;
        listener.puckHitPaddle  = false;
        listener.puckHitWall    = false;
        this.set( "contactListener", listener );

        listener.BeginContact = function( contact ) {
          var fixtureA = contact.GetFixtureA();
          var fixtureB = contact.GetFixtureB();

          var fixtureAData = fixtureA.GetBody().GetUserData();
          var fixtureBData = fixtureB.GetBody().GetUserData();
          var otherFixtureData;

          // pucks are the only important thing, so find out which fixture is the Puck, if it's not we don't care about the contact
          if( fixtureAData == TAGS.kTagPuck ) {
            otherFixtureData = fixtureBData;
          } else if( fixtureBData == TAGS.kTagPuck ) {
            otherFixtureData = fixtureAData;
          } else { return; }

          // scored goal
          if( otherFixtureData == TAGS.kTagBlueGoal ) {
            console.log( "RED SCORED" );
            this.redJustScored = true;
            return;
          } else if( otherFixtureData == TAGS.kTagRedGoal ) {
            console.log( "BLUE SCORED" );
            this.blueJustScored = true;
            return;
          }

          if( otherFixtureData == TAGS.kTagPaddle ) {
            this.puckHitPaddle = true;
            return;
          }

          if( otherFixtureData == TAGS.kTagWall ) {
            this.puckHitWall = true;
            return;
          }
        }

        world.SetContactListener( listener );

        this.playSound( "buzzer" ) // game start

        /* ------------------------------------------------------------------------------
         * ------------------------------------------------------------------------------
         *                                GAME ELEMENTS
         * -----------------------------------------------------------------------------
         * -----------------------------------------------------------------------------
         * Z indexes:
         *
         * Background: -1
         * Walls     : 0
         * Score     : 10
         * Puck      : 20
         * Paddle    : 20
         * Goal      : 30
         * Red Wall  : 30
         * Blue Wall : 30
         *
         * ------------------------------------------------------------------------------
         *  Collision Filters
         *
         *  Category:
         *    Wall   : 1
         *    Paddle : 2
         *    Puck   : 4
         *    Center : 8
         *
         *  Mask:
         *    Wall   : n/a
         *    Puck   : 3
         *    Paddle : 15
         *
         *
         *  */


        var winSize = cocos.Director.get( "sharedDirector" ).get( "winSize" );

        var background = cocos.nodes.Sprite.create( { file : "/resources/groundbg.png" } );
        background.set( "position", new geo.Point( winSize.width / 2, winSize.height / 2 ) );
        this.addChild( { child : background, z : -1 } );

        var boundaryBodyDef    = new box2d.b2BodyDef;
        var boundaryFixtureDef = new box2d.b2FixtureDef;

        boundaryBodyDef.type = box2d.b2Body.b2_staticBody;
        boundaryBodyDef.userData = TAGS.kTagWall;

        boundaryFixtureDef.density     = 1.0;
        boundaryFixtureDef.restitution = 0.2;
        boundaryFixtureDef.friction    = 0.5;
        boundaryFixtureDef.shape       = new box2d.b2PolygonShape;
        boundaryFixtureDef.filter.categoryBits = 1;

        /* ------------------------------
         * LEFT WALL
         * ------------------------------ */

        /* left wall size : 16 x 480 */
        boundaryFixtureDef.shape.SetAsBox( 8 / PTM_RATIO, 240 / PTM_RATIO );
        boundaryBodyDef.position.Set( 8 / PTM_RATIO, 240 / PTM_RATIO );

        var leftWallSprite = cocos.nodes.Sprite.create( { file : "/resources/sLeftWall.png" } );
        leftWallSprite.set( "position", new geo.Point( boundaryBodyDef.position.x * PTM_RATIO, boundaryBodyDef.position.y * PTM_RATIO ) );
        this.addChild( { child : leftWallSprite, z : 0 } );

        var boundaryBody = world.CreateBody( boundaryBodyDef );
        boundaryBody.CreateFixture( boundaryFixtureDef );
        this.get( "bodies" ).push( boundaryBody );
        boundaryBody.sprite = leftWallSprite;

        /* ------------------------------
         * RIGHT WALL
         * ------------------------------ */

        /* right wall size : 16 x 480 */
        boundaryFixtureDef.shape.SetAsBox( 8 / PTM_RATIO, 240 / PTM_RATIO );
        boundaryBodyDef.position.Set( (winSize.width - 8) / PTM_RATIO, 240 / PTM_RATIO );

        var rightWallSprite = cocos.nodes.Sprite.create( { file : "/resources/sRightWall.png" } );
        rightWallSprite.set( "position", new geo.Point( boundaryBodyDef.position.x * PTM_RATIO, boundaryBodyDef.position.y * PTM_RATIO ) );
        this.addChild( rightWallSprite );

        var boundaryBody = world.CreateBody( boundaryBodyDef );
        boundaryBody.CreateFixture( boundaryFixtureDef );
        this.get( "bodies" ).push( boundaryBody );
        boundaryBody.sprite = rightWallSprite;

        /* --------------------------------
         * RED WALL
         * -------------------------------- */

        /* red wall size : 320 x 22 */
        boundaryFixtureDef.shape.SetAsBox( 160 / PTM_RATIO, 11 / PTM_RATIO );
        boundaryBodyDef.position.Set( (winSize.width / 2) / PTM_RATIO, 11 / PTM_RATIO );

        var redWallSprite = cocos.nodes.Sprite.create( { file : "/resources/sredBar.png" } );
        redWallSprite.set( "position", new geo.Point( boundaryBodyDef.position.x * PTM_RATIO, boundaryBodyDef.position.y * PTM_RATIO ) );
        this.addChild( { child : redWallSprite, z : 0 } );

        var boundaryBody = world.CreateBody( boundaryBodyDef );
        boundaryBody.CreateFixture( boundaryFixtureDef );
        this.get( "bodies" ).push( boundaryBody );
        boundaryBody.sprite = redWallSprite;

        /* --------------------------------
         * BLUE WALL
         * -------------------------------- */

        /* blue wall size : 320 x 22 */
        boundaryFixtureDef.shape.SetAsBox( 160 / PTM_RATIO, 11 / PTM_RATIO );
        boundaryBodyDef.position.Set( (winSize.width / 2) / PTM_RATIO, (winSize.height - 10) / PTM_RATIO );

        var blueWallSprite = cocos.nodes.Sprite.create( { file : "/resources/sblueBar.png" } );
        blueWallSprite.set( "position", new geo.Point( boundaryBodyDef.position.x * PTM_RATIO, boundaryBodyDef.position.y * PTM_RATIO ) );
        this.addChild( { child : blueWallSprite, z : 0 } );

        var boundaryBody = world.CreateBody( boundaryBodyDef );
        boundaryBody.CreateFixture( boundaryFixtureDef );
        this.get( "bodies" ).push( boundaryBody );
        boundaryBody.sprite = blueWallSprite;

        /* --------------------------------
         * RED GOAL
         * -------------------------------- */

        /* red goal size : 136 x 14 */
        boundaryFixtureDef.shape.SetAsBox( 68 / PTM_RATIO, 8 / PTM_RATIO );
        boundaryBodyDef.position.Set( (winSize.width / 2) / PTM_RATIO, (11 + 3.5) / PTM_RATIO );

        var redGoalSprite = cocos.nodes.Sprite.create( { file : "/resources/goal.png" } );
        redGoalSprite.set( "position", new geo.Point( boundaryBodyDef.position.x * PTM_RATIO, boundaryBodyDef.position.y * PTM_RATIO ) );
        this.addChild( { child : redGoalSprite, z : 0 } );

        var boundaryBody = world.CreateBody( boundaryBodyDef );
        boundaryBody.CreateFixture( boundaryFixtureDef );
        this.get( "bodies" ).push( boundaryBody );
        boundaryBody.sprite = redGoalSprite;

        boundaryBody.SetUserData( TAGS.kTagRedGoal );

        /* --------------------------------
         * BLUE GOAL
         * -------------------------------- */

        /* blue goal size : 136 x 14 */
        boundaryFixtureDef.shape.SetAsBox( 68 / PTM_RATIO, 8 / PTM_RATIO );
        boundaryBodyDef.position.Set( (winSize.width / 2) / PTM_RATIO, (winSize.height - 10 - 3.5) / PTM_RATIO );

        var blueGoalSprite = cocos.nodes.Sprite.create( { file : "/resources/goal.png" } );
        blueGoalSprite.set( "position", new geo.Point( boundaryBodyDef.position.x * PTM_RATIO, boundaryBodyDef.position.y * PTM_RATIO ) );
        this.addChild( { child : blueGoalSprite, z : 0 } );

        var boundaryBody = world.CreateBody( boundaryBodyDef );
        boundaryBody.CreateFixture( boundaryFixtureDef );
        this.get( "bodies" ).push( boundaryBody );
        boundaryBody.sprite = blueGoalSprite;

        boundaryBody.SetUserData( TAGS.kTagBlueGoal );

        /* --------------------------------
         * CENTER LINE
         * -------------------------------- */

        boundaryFixtureDef.filter.categoryBits = 8;
        boundaryFixtureDef.shape.SetAsBox( (winSize.width / 2) / PTM_RATIO, 1 / PTM_RATIO );
        boundaryBodyDef.position.Set( (winSize.width / 2) / PTM_RATIO, (winSize.height / 2) / PTM_RATIO );

        var centerLineSprite = cocos.nodes.Sprite.create( { file : "/resources/centerLine.png" } );
        centerLineSprite.set( "position", new geo.Point( boundaryBodyDef.position.x * PTM_RATIO, boundaryBodyDef.position.y * PTM_RATIO ) );
        this.addChild( { child : centerLineSprite, z : -1 } );

        var centerBody = world.CreateBody( boundaryBodyDef );
        centerBody.CreateFixture( boundaryFixtureDef );
        this.get( "bodies" ).push( centerBody );
        centerBody.sprite = centerLineSprite;

        /* ----------------------
         * PUCK
         * ---------------------- */

        /* puck size : 47 x 47 */

        var puckBodyDef = new box2d.b2BodyDef;
        var puckFixture = new box2d.b2FixtureDef;

        // puck is a little off-center, so adjust by (-1,-1) px
        puckBodyDef.position.Set( (winSize.width / 2 - 1) / PTM_RATIO, (winSize.height / 2 - 1) / PTM_RATIO );
        puckBodyDef.type = box2d.b2Body.b2_dynamicBody;

        puckFixture.density = 1.0;
        puckFixture.friction = 0.9;
        puckFixture.restitution = 1.0;
        puckFixture.shape = new box2d.b2CircleShape( (47 / 2) / PTM_RATIO );
        puckFixture.filter.categoryBits = 4;
        puckFixture.filter.maskBits = 3;


        var puckSprite = cocos.nodes.Sprite.create( { file : "/resources/spuck.png" } );
        puckSprite.set( "position", new geo.Point( puckBodyDef.position.x * PTM_RATIO, puckBodyDef.position.y * PTM_RATIO ) );
        this.addChild( { child : puckSprite, z : 20 } );

        var puckBody = world.CreateBody( puckBodyDef );
        puckBody.sprite = puckSprite;
        this.get( "bodies" ).push( puckBody );
        puckBody.CreateFixture( puckFixture );

        puckBody.SetUserData( TAGS.kTagPuck );
        puckBody.SetFixedRotation( true );

        this.set( "puckBody", puckBody );

        /* ----------------------
         * PADDLES
         * ---------------------- */

        var paddleBodyDef = new box2d.b2BodyDef;
        var paddleFixture = new box2d.b2FixtureDef;

        paddleBodyDef.type = box2d.b2Body.b2_dynamicBody;
        paddleBodyDef.fixedRotation = true
        paddleBodyDef.userData = TAGS.kTagPaddle;

        paddleFixture.density = 1.0;
        paddleFixture.friction = 0.2;
        paddleFixture.restitution = 0.5;
        paddleFixture.shape = new box2d.b2CircleShape( (55 / 2) / PTM_RATIO );
        paddleFixture.filter.categoryBits = 2;
        paddleFixture.filter.maskBits = 15;

        /* ----------------------
         * RED PADDLE
         * ---------------------- */

        /* redPaddle size : 55 x 55 */
        paddleBodyDef.position.Set( (winSize.width / 2) / PTM_RATIO, (winSize.height / 5) / PTM_RATIO );

        var redPaddleSprite = cocos.nodes.Sprite.create( { file : "/resources/spaddle.png" } );
        redPaddleSprite.set( "position", new geo.Point( paddleBodyDef.position.x * PTM_RATIO, paddleBodyDef.position.y * PTM_RATIO ) );
        this.addChild( { child : redPaddleSprite, z : 20, tag : TAGS.kTagPaddle } );

        var redPaddleBody = world.CreateBody( paddleBodyDef );
        redPaddleBody.sprite = redPaddleSprite;
        this.get( "bodies" ).push( redPaddleBody );
        redPaddleBody.CreateFixture( paddleFixture );

        this.set( "redPaddleBody", redPaddleBody );

        /* ----------------------
         * BLUE PADDLE
         * ---------------------- */

        /* bluePaddle size : 55 x 55 */
        paddleBodyDef.position.Set( (winSize.width / 2) / PTM_RATIO, (4 * winSize.height / 5) / PTM_RATIO );

        var bluePaddleSprite = cocos.nodes.Sprite.create( { file : "/resources/spaddle.png" } );
        bluePaddleSprite.set( "position", new geo.Point( paddleBodyDef.position.x * PTM_RATIO, paddleBodyDef.position.y * PTM_RATIO ) );
        this.addChild( { child : bluePaddleSprite, z : 20, tag : TAGS.kTagPaddle } );

        var bluePaddleBody = world.CreateBody( paddleBodyDef );
        bluePaddleBody.sprite = bluePaddleSprite;
        bluePaddleBody.limits = { upper : { y : winSize.height / 2 } };
        this.get( "bodies" ).push( bluePaddleBody );
        bluePaddleBody.CreateFixture( paddleFixture );

        this.set( "bluePaddleBody", bluePaddleBody );

        var redScore = cocos.nodes.Label.create( { string : "0", fontName : "Helvetica", fontSize: "40", fontColor : "#ff0000" } );
        redScore.set( 'rotation', 90.0 );
        redScore.set( "position", new geo.Point( 40, winSize.height / 2 - 17 ) );
        this.addChild( { child : redScore, z : 10, tag : TAGS.kTagRedScore } );

        var blueScore = cocos.nodes.Label.create( { string : "0", fontName : "Helvetica", fontSize: "40", fontColor : "#0000ff" } );
        blueScore.set( 'rotation', 90.0 );
        blueScore.set( "position", new geo.Point( 40, winSize.height / 2 + 17 ) );
        this.addChild( { child : blueScore, z : 10, tag : TAGS.kTagBlueScore } );

        /*
        //setup debug draw
        var debugDraw = new box2d.b2DebugDraw();
            debugDraw.SetSprite(document.getElementById('debug-canvas').getContext("2d"));
            debugDraw.SetDrawScale(30.0);
            debugDraw.SetFillAlpha(0.5);
            debugDraw.SetLineThickness(1.0);
            debugDraw.SetFlags(box2d.b2DebugDraw.e_shapeBit | box2d.b2DebugDraw.e_jointBit);
            world.SetDebugDraw(debugDraw); */
    },

    getBodyAtPoint: function (point) {
        point = new geo.Point(point.x /PTM_RATIO, point.y /PTM_RATIO);
        var world = this.get('world');
        var mousePVec = new box2d.b2Vec2(point.x, point.y);
        var aabb = new box2d.b2AABB();
        aabb.lowerBound.Set(point.x - 0.001, point.y - 0.001);
        aabb.upperBound.Set(point.x + 0.001, point.y + 0.001);


        var self = this;
        function getBodyCB(fixture) {
            if(fixture.GetBody().GetType() != box2d.b2Body.b2_staticBody) {
                if(fixture.GetShape().TestPoint(fixture.GetBody().GetTransform(), mousePVec)) {
                    self.set('selectedBody', fixture.GetBody());
                    return false;
                }
            }
            return true;
        }


        // Query the world for overlapping shapes.

        this.set('selectedBody', null);
        world.QueryAABB(getBodyCB, aabb);
        return this.get('selectedBody');
    },

    mouseDown: function(evt) {
        var point = evt.locationInCanvas,
            world = this.get('world'),
            mouseJoint = this.get('mouseJoint');

        if (!mouseJoint) {
            var body = this.getBodyAtPoint(point);
            if( body && body.sprite.get( "tag" ) == TAGS.kTagPaddle ) {
                var md = new box2d.b2MouseJointDef();
                md.bodyA = world.GetGroundBody();
                md.bodyB = body;
                md.target.Set(body.GetPosition().x, body.GetPosition().y );
                md.collideConnected = true;
                md.maxForce = 300.0 * body.GetMass();
                mouseJoint = world.CreateJoint(md);
                body.SetAwake(true);
                this.set('mouseJoint', mouseJoint);
            }
        }
    },

    mouseDragged: function(evt) {
        var point = evt.locationInCanvas,
            world = this.get('world'),
            mouseJoint = this.get('mouseJoint');

        if (mouseJoint) {
            mouseJoint.SetTarget(new box2d.b2Vec2(point.x /PTM_RATIO, point.y /PTM_RATIO));
        }
    },

    mouseUp: function(evt) {
        var mouseJoint = this.get('mouseJoint'),
            world = this.get('world');

        if (mouseJoint) {
            world.DestroyJoint(mouseJoint);
            this.set('mouseJoint', null);
        }
    }
});

// Initialise everything

// Get director
var director = cocos.Director.get('sharedDirector');

// Attach director to our <div> element
director.attachInView(document.getElementById('cocos2d-app'));

director.set('displayFPS', false);

// Create a scene
var scene = cocos.nodes.Scene.create();

// Add our layer to the scene
scene.addChild( { child: Splash.create() } );

// Run the scene
var assets = [
  "spaddle.png",
  "spuck.png",
  "titleSplash.png",
  "playButton.png",
  "screenshot.png",
  "redPlayerWins.png",
  "bluePlayerWins.png",
  "rematchButton.png",
  "sLeftWall.png",
  "sRightWall.png",
  "groundbg.png",
  "sredBar.png",
  "sblueBar.png",
  "goal.png",
  "winner.wav",
  "buzzer.wav",
  "goalScore.wav",
  "puckHitPaddle.wav",
  "puckHitWall.wav"
]


// preload the assets
for( i = 0; i < assets.length; i++ ) {
  var url = assets[ i ];
  var img = new Image();
  img.src = url;
}

director.runWithScene(scene);
