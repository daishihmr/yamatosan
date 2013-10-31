var STATS = false;
var bfs = {
    core: null,
    sea: null,
    myShip: null,
    enemies: null,
    score: 0,
};

tm.preload(function() {
    if (STATS) tm.util.ScriptManager.loadStats();
});
tm.main(function() {
    bfs.core = tm.display.CanvasApp("#app")
        .resize(500, 500);
    if (STATS) bfs.core.enableStats();

    bfs.core.fitWindow();
    var assets = {
        "title": "title.png",
        "ship0": "ship0.png",
        "ship1": "ship1.png",
        "bullet": "bullet.png",
        "background": "background.png",
        "explosion": "explosion.png",
        "splash": "splash.png",
    };
    if (tm.BROWSER === "Chrome") {
        assets["soundExplosion"] = "se_maoudamashii_explosion05.mp3";
        assets["soundSplash"] = "sen_ge_bom13.mp3";
        assets["soundFire"] = "sen_ge_taihou03.mp3";
        assets["soundChange"] = "se_maoudamashii_system36.mp3";
    }
    bfs.core.replaceScene(tm.app.LoadingScene({
        assets: assets,
        nextScene: function() {
            ["ship1"].forEach(function(name) {

                var tex = tm.asset.AssetManager.get(name);
                var canvas = tm.graphics.Canvas();
                canvas.resize(tex.width, tex.height);
                canvas.drawTexture(tex, 0, 0);

                var bmRed = canvas.getBitmap();
                bmRed.filter({
                    calc: function(pixel, index, x, y, bitmap) {
                        bitmap.setPixelIndex(index, pixel[0], 0, 0);
                    }
                });
                var cvRed = tm.graphics.Canvas();
                cvRed.resize(tex.width, tex.height);
                cvRed.drawBitmap(bmRed, 0, 0);
                tm.asset.AssetManager.set(name + "Red", cvRed);
            });            
            return  bfs.TitleScene();   
        },
    }));
    bfs.core.run();
});

var label = function(text, size, x, y, addTarget) {
    var l = tm.display.Label(text, size)
        .setAlign("center")
        .setBaseline("middle")
        .setPosition(x, y)
        .setShadowColor("#FFF957")
        .setShadowBlur(30);
    l.addChildTo(addTarget);
    return l;
};

tm.define("bfs.TitleScene", {
    superClass: tm.app.Scene,

    init: function() {
        this.superInit();

        tm.display.Sprite("title", 500, 500)
            .setPosition(250, 250)
            .addChildTo(this);
        label("大海戦！", 60, 250, 70, this).setFillStyle("#F2CF30");
        label("ヤマトさん", 90, 250, 150, this).setFillStyle("#ED7D0C");
        label("スペースキーを押してください", 20, 250, 350, this);
    },

    update: function(app) {
        if (app.keyboard.getKeyDown("space")) {
            app.replaceScene(bfs.MainScene());
        }
    },

});

tm.define("bfs.GameOverScene", {
    superClass: tm.app.Scene,

    score: 0,

    init: function() {
        this.superInit();

        this.score = bfs.score;

        label("轟沈", 40, 250, 150, this).setFillStyle("#F25A30");
        label("得点: " + this.score, 40, 250, 250, this);
        label("スペースキーを押してください", 20, 250, 350, this).setFillStyle("#F25A30");
    },

    update: function(app) {
        if (app.keyboard.getKeyDown("space")) {
            tm.social.Nineleap.postRanking(this.score, "得点 " + this.score);
        }
    },

});

tm.define("bfs.GameClearScene", {
    superClass: tm.app.Scene,

    score: 0,

    init: function() {
        this.superInit();

        this.score = bfs.score + bfs.myShip.hp * 10000;

        label("敵艦隊 全滅", 40, 250, 150, this);
        label("得点: " + this.score, 40, 250, 250, this);
        label("スペースキーを押してください", 20, 250, 350, this);
    },

    update: function(app) {
        if (app.keyboard.getKeyDown("space")) {
            tm.social.Nineleap.postRanking(this.score, "得点 " + this.score);
        }
    },

});

var playSound = function(soundName) {
    if (playSound.played[soundName] !== bfs.core.frame) {
        var s = tm.asset.AssetManager.get(soundName);
        if (s) s.clone().play();
        playSound.played[soundName] = bfs.core.frame;
    }
};
playSound.played = {};

tm.define("bfs.MainScene", {
    superClass: tm.app.Scene,

    sea: null,
    myShip: null,

    label: null,
    label2: null,

    init: function() {
        this.superInit();

        bfs.sea = this.sea = bfs.Sea();
        this.sea.addChildTo(this);

        bfs.myShip = this.myShip = bfs.MyShip();
        this.myShip.addChildTo(this.sea.topLayer);

        bfs.enemies = [];
        for (var i = 0; i < 10; i++) {
            var d = Math.random() * Math.PI * 2;
            var l = Math.rand(1500, 5000);
            var e = bfs.AIShip(0.4)
                .setPosition(Math.cos(d)*l, Math.sin(d)*l)
                .setRotation(Math.rand(0, 360));
            e.addChildTo(this.sea.topLayer);
            bfs.enemies.push(e);

        }

        this.sea.setPosition(-this.myShip.x + 500/2, -this.myShip.y + 500/2);

        this.label = label("敵艦 残り " + bfs.enemies.length + "隻", 20, 250, 50, this);
        this.label2 = label("耐久力 残り " + bfs.myShip.hp, 20, 250, 450, this);

        bfs.Lader().setPosition(500-80, 80).addChildTo(this);
    },

    update: function() {
        this.sea.setPosition(-this.myShip.x + 500/2, -this.myShip.y + 500/2);
        this.label.text = "敵艦 残り " + bfs.enemies.length + "隻";
        this.label2.text = "耐久力 残り " + bfs.myShip.hp;
    },

    draw: function(canvas) {
        var xi = Math.floor(this.sea.x) % 256;
        var yi = Math.floor(this.sea.y) % 256;
        while (xi < 0) xi += 256;
        while (yi < 0) yi += 256;
        canvas.drawTexture(tm.asset.AssetManager.get("background"), xi - 256, yi - 256, 256, 256);
        canvas.drawTexture(tm.asset.AssetManager.get("background"), xi - 256, yi      , 256, 256);
        canvas.drawTexture(tm.asset.AssetManager.get("background"), xi - 256, yi + 256, 256, 256);
        canvas.drawTexture(tm.asset.AssetManager.get("background"), xi      , yi - 256, 256, 256);
        canvas.drawTexture(tm.asset.AssetManager.get("background"), xi      , yi      , 256, 256);
        canvas.drawTexture(tm.asset.AssetManager.get("background"), xi      , yi + 256, 256, 256);
        canvas.drawTexture(tm.asset.AssetManager.get("background"), xi + 256, yi - 256, 256, 256);
        canvas.drawTexture(tm.asset.AssetManager.get("background"), xi + 256, yi      , 256, 256);
        canvas.drawTexture(tm.asset.AssetManager.get("background"), xi + 256, yi + 256, 256, 256);
    },

    scrollTo: function(x, y) {
        this.tweener.clear().to({
            x: x + 500/2,
            y: y + 500/2,
        }, 500, "easeInOutQuad");
    },

});

tm.define("bfs.Sea", {
    superClass: tm.app.Object2D,

    topLayer: null,
    bottomLayer: null,

    init: function() {
        this.superInit();

        this.bottomLayer = tm.app.Object2D();
        this.bottomLayer.addChildTo(this);

        this.topLayer = tm.app.Object2D();
        this.topLayer.addChildTo(this);
    },

});

tm.define("bfs.Ship", {
    superClass: tm.display.Sprite,

    maxHp: 5,
    maxVelocity: 1.0,
    accel: 0.02,
    turnSpeed: 0.24,
    bulletLimit: 40,

    cannons: null,

    hp: 0,
    velocity: 0,
    ahead: 0,
    turn: 0,

    init: function(scale) {
        this.superInit("ship0");
        this.setScale(scale);

        this.hp = this.maxHp;

        this.cannons = [];

        this.cannons[0] = tm.display.Sprite("ship1", 400, 400);
        this.cannons[0].heat = 0;
        this.cannons[0].setScale(0.3).setPosition( 70, 0).addChildTo(this);
        this.cannons[0].minRotation = 0 - 110;
        this.cannons[0].maxRotation = 0 + 110;
        this.cannons[0].rotDir = 1;

        this.cannons[1] = tm.display.Sprite("ship1", 400, 400);
        this.cannons[1].heat = 0;
        this.cannons[1].setScale(0.3).setPosition( 25, 0).addChildTo(this);
        this.cannons[1].minRotation = 0 - 110;
        this.cannons[1].maxRotation = 0 + 110;
        this.cannons[1].rotDir = 1;

        this.cannons[2] = tm.display.Sprite("ship1", 400, 400);
        this.cannons[2].heat = 0;
        this.cannons[2].rotation = 180;
        this.cannons[2].setScale(0.3).setPosition(-100, 0).addChildTo(this);
        this.cannons[2].minRotation = 180 - 110;
        this.cannons[2].maxRotation = 180 + 110;
        this.cannons[2].rotDir = -1;
    },

    damage: function() {
        this.hp -= 1;
        if (this.hp <= 0) {
            bfs.Explode(this.x, this.y).addChildTo(bfs.sea.topLayer);
            playSound("soundExplosion");

            this.tweener.clear()
                .wait(Math.rand(200, 600))
                .call(function() {
                    bfs.Explode(this.x, this.y).addChildTo(bfs.sea.topLayer);
                    playSound("soundExplosion");
                }.bind(this))
                .wait(Math.rand(200, 600))
                .call(function() {
                    bfs.Explode(this.x, this.y).addChildTo(bfs.sea.topLayer);
                    playSound("soundExplosion");
                }.bind(this))
                .wait(Math.rand(200, 600))
                .call(function() {
                    bfs.Explode(this.x, this.y).addChildTo(bfs.sea.topLayer);
                    playSound("soundExplosion");
                }.bind(this))
                .wait(Math.rand(200, 600))
                .call(function() {
                    bfs.Explode(this.x, this.y, 3).addChildTo(bfs.sea.topLayer);
                    bfs.SplashL(this.x+Math.rand(5, 30), this.y+Math.rand(5, 30) - 30).addChildTo(bfs.sea.topLayer);
                    bfs.Hamon(this.x+Math.rand(5, 30), this.y+Math.rand(5, 30), 1).addChildTo(bfs.sea.bottomLayer);
                    bfs.SplashL(this.x+Math.rand(5, 30), this.y+Math.rand(5, 30) - 30).addChildTo(bfs.sea.topLayer);
                    bfs.Hamon(this.x+Math.rand(5, 30), this.y+Math.rand(5, 30), 1).addChildTo(bfs.sea.bottomLayer);
                    bfs.SplashL(this.x+Math.rand(5, 30), this.y+Math.rand(5, 30) - 30).addChildTo(bfs.sea.topLayer);
                    bfs.Hamon(this.x+Math.rand(5, 30), this.y+Math.rand(5, 30), 1).addChildTo(bfs.sea.bottomLayer);
                    playSound("soundExplosion");
                    if (this.parent) this.remove();
                    if (this !== bfs.myShip) bfs.enemies.erase(this);
                    this.onDestroy();
                }.bind(this));

        }
    },

    onDestroy: function() {},

    update: function(app) {
        this.x += Math.cos(this.rotation * Math.DEG_TO_RAD) * this.velocity;
        this.y += Math.sin(this.rotation * Math.DEG_TO_RAD) * this.velocity;

        if (this.ahead > 0) {
            this.velocity = Math.min(this.velocity + this.accel, this.maxVelocity);
        } else if (this.ahead < 0) {
            this.velocity = Math.max(this.velocity - this.accel, -this.maxVelocity * 0.5);
        } else {
            this.velocity *= 0.99;
            if (Math.abs(this.velocity) < 0.1) {
                this.velocity = 0;
            }
        }

        if (this.turn !== 0) {
            this.rotation += this.turn * this.turnSpeed * this.velocity;
        }

        this.cannons.forEach(function(cannon) {
            cannon.heat -= 1;
        });

        if (app.frame % 3 === 0 && Math.abs(this.velocity) > 0.1) {
            bfs.Hamon(this.x, this.y, 0.5).addChildTo(bfs.sea.bottomLayer);
        }
    },

    rotateCannon: function(cannon, rot) {
        cannon.rotation = Math.clamp(cannon.rotation + rot * cannon.rotDir, cannon.minRotation, cannon.maxRotation);
    },

    fireCannon: function(cannon, frame) {
        if (cannon.heat <= 0) {
            var mv;
            if (this.velocity !== 0) {
                mv = tm.geom.Vector2().setDegree(this.rotation, this.velocity);
            } else {
                mv = tm.geom.Vector2.ZERO;
            }

            var p0 = this.parent.globalToLocal(cannon.localToGlobal({ x: 200, y: -60 }));
            bfs.Bullet(this.bulletLimit, mv, this === bfs.myShip)
                .setPosition(p0.x, p0.y)
                .setRotation(this.rotation + cannon.rotation)
                .addChildTo(bfs.sea.topLayer);
            
            var p1 = this.parent.globalToLocal(cannon.localToGlobal({ x: 250, y: 0 }));
            bfs.Bullet(this.bulletLimit, mv, this === bfs.myShip)
                .setPosition(p1.x, p1.y)
                .setRotation(this.rotation + cannon.rotation)
                .addChildTo(bfs.sea.topLayer);
            
            var p2 = this.parent.globalToLocal(cannon.localToGlobal({ x: 200, y: 60 }));
            bfs.Bullet(this.bulletLimit, mv, this === bfs.myShip)
                .setPosition(p2.x, p2.y)
                .setRotation(this.rotation + cannon.rotation)
                .addChildTo(bfs.sea.topLayer);

            bfs.Explode(p1.x, p1.y).setScale(0.5).setRotation(Math.rand(0, 360)).addChildTo(bfs.sea.topLayer);

            bfs.Hamon(p1.x, p1.y, 1).addChildTo(bfs.sea.bottomLayer);

            playSound("soundFire");

            cannon.heat = 60;
        }
    },

});

tm.define("bfs.AIShip", {
    superClass: bfs.Ship,

    maxVelocity: 1.3,
    accel: 0.03,
    turnSpeed: 0.20,
    bulletLimit: 50,
    turnFlag: false,

    init: function(scale) {
        this.superInit(scale);
    },

    update: function(app) {
        var dir = Math.atan2(bfs.myShip.y - this.y, bfs.myShip.x - this.x)*Math.RAD_TO_DEG - this.rotation;
        while(dir <= -180) dir += 360;
        while(180 < dir) dir -= 360;

        var dist = Math.sqrt((bfs.myShip.x - this.x)*(bfs.myShip.x - this.x) + (bfs.myShip.y - this.y)*(bfs.myShip.y - this.y));

        if (dist < 500) {
            if (!this.turnFlag) {
                this.turn = Math.rand(-1, 1) * 0.5;
                this.turnFlag = true;
            }
        } else {
            this.turnFlag = false;
            if (-150 < dir && dir < 150) {
                this.ahead = 1;
                if (dir < 10) {
                    this.turn = -1;
                } else if (-10 < dir) {
                    this.turn = 1
                } else {
                    this.turn = 0;
                }
            } else {
                this.ahead = -1;
                if (dir < 10) {
                    this.turn = -1;
                } else if (-10 < dir) {
                    this.turn = 1
                } else {
                    this.turn = 0;
                }
            }
        }

        if (dist < 1000) {
            if (dir < this.cannons[0].rotation) {
                this.rotateCannon(this.cannons[0], -0.5);
            } else if (this.cannons[0].rotation < dir) {
                this.rotateCannon(this.cannons[0], 0.5);
            }
            if (dir < this.cannons[1].rotation) {
                this.rotateCannon(this.cannons[1], -0.5);
            } else if (this.cannons[1].rotation < dir) {
                this.rotateCannon(this.cannons[1], 0.5);
            }
            if (dir < this.cannons[2].rotation) {
                this.rotateCannon(this.cannons[2], 0.5);
            } else if (this.cannons[2].rotation < dir) {
                this.rotateCannon(this.cannons[2], -0.5);
            }
        }

        if (dist < 700 && Math.random() < 0.02) {
            this.fireCannon(this.cannons.random(), app.frame);
        }

        this.superClass.prototype.update.call(this, app);
    },

    onDestroy: function() {
        bfs.score += 1000;
        if (bfs.enemies.length === 0) {
            bfs.sea.tweener
                .wait(3000)
                .call(function() {
                    bfs.core.replaceScene(bfs.GameClearScene());
                });
        }
    },

});

tm.define("bfs.MyShip", {
    superClass: bfs.Ship,

    maxHp: 20000,
    maxVelocity: 1.5,
    accel: 0.03,
    turnSpeed: 0.24,
    bulletLimit: 60,

    selectedCannon: 0,

    markers: null,

    init: function() {
        this.superInit(0.5);
        var self = this;
        this.cannons[0].update = function() {
            if (self.cannons[self.selectedCannon] === this) {
                this.image = "ship1Red";
            } else {
                this.image = "ship1";
            }
        };
        this.cannons[1].update = function() {
            if (self.cannons[self.selectedCannon] === this) {
                this.image = "ship1Red";
            } else {
                this.image = "ship1";
            }
        };
        this.cannons[2].update = function() {
            if (self.cannons[self.selectedCannon] === this) {
                this.image = "ship1Red";
            } else {
                this.image = "ship1";
            }
        };

        this.markers = [];
        for (var i = 0; i < 100; i++) {
            this.markers.push(tm.display.TriangleShape(20, 20, {
                strokeStyle: "transparent",
                fillStyle: "red",
            }));
        }
    },

    update: function(app) {
        if (app.keyboard.getKeyDown("p")) {
            app.canvas.saveAsImage();
        }

        if (app.keyboard.getKey("up")) {
            this.ahead = 1;
        } else if (app.keyboard.getKey("down")) {
            this.ahead = -1;
        } else {
            this.ahead = 0;
        }
        if (app.keyboard.getKey("right")) {
            this.turn = 1;
        } else if (app.keyboard.getKey("left")) {
            this.turn = -1;
        } else {
            this.turn = 0;
        }

        if (app.keyboard.getKeyDown("w")) {
            this.selectedCannon = (this.selectedCannon - 1 + this.cannons.length) % this.cannons.length;
            playSound("soundChange");
        } else if (app.keyboard.getKeyDown("s")) {
            this.selectedCannon = (this.selectedCannon + 1 + this.cannons.length) % this.cannons.length;
            playSound("soundChange");
        }

        if (app.keyboard.getKey("d")) {
            this.cannons.forEach(function(cannon) {
                this.rotateCannon(cannon, 1);
            }.bind(this));
        } else if (app.keyboard.getKey("a")) {
            this.cannons.forEach(function(cannon) {
                this.rotateCannon(cannon, -1);
            }.bind(this));
        }

        if (app.keyboard.getKeyDown("space")) {
            this.fireCannon(this.cannons[this.selectedCannon], app.frame);
        }

        // 敵艦との衝突
        if (this.hp > 0) {
            bfs.enemies.forEach(function(enemy) {
                if (bfs.isHitElement(this, enemy)) {
                    playSound("soundExplosion");
                    this.damage();
                    enemy.damage();

                    var v = tm.geom.Vector2(enemy.x - this.x, enemy.y - this.y).normalize();
                    var mv = tm.geom.Vector2().setDegree(this.rotation, this.velocity).normalize();
                    var ev = tm.geom.Vector2().setDegree(enemy.rotation, enemy.velocity).normalize();
                    if (tm.geom.Vector2.dot(v, mv) > 0.5) {
                        this.velocity *= -1;
                    }
                    if (tm.geom.Vector2.dot(v, ev) < -0.5) {
                        enemy.velocity *= -1;
                    }
                }
            }.bind(this));
        }

        for (var i = 0; i < bfs.enemies.length; i++) {
            var e = bfs.enemies[i];
            var d = Math.atan2(e.y - this.y, e.x - this.x);
            var l = tm.geom.Vector2(e.x - this.x, e.y - this.y).length();
            this.markers[i]
                .setPosition(this.x + Math.cos(d)*100, this.y + Math.sin(d)*100)
                .setRotation(d*Math.RAD_TO_DEG+90)
                .setScale(Math.max(0.4, (2000-l)/1500))
                .addChildTo(bfs.sea.topLayer);
        }
        for (var j = i; j < this.markers.length; j++) {
            if (this.markers[j].parent) this.markers[j].remove();
        }

        this.superClass.prototype.update.call(this, app);
    },

    onDestroy: function() {
        bfs.sea.tweener
            .wait(3000)
            .call(function() {
                bfs.core.replaceScene(bfs.GameOverScene());
            }.bind(this));
    },

});

tm.define("bfs.Bullet", {
    superClass: tm.display.Sprite,

    age: 0,
    limit: 0,
    velocity: 5,
    isMine: false,
    parentVec: null,

    init: function(limit, parentVec, isMine) {
        this.superInit("bullet");
        this.limit = limit;
        this.isMine = isMine;
        this.parentVec = parentVec;
    },

    update: function(app) {
        this.x += Math.cos(this.rotation * Math.DEG_TO_RAD) * this.velocity + this.parentVec.x;
        this.y += Math.sin(this.rotation * Math.DEG_TO_RAD) * this.velocity + this.parentVec.y;
        this.setScale(0.2 + (this.limit - this.age) / this.limit);

        if (this.isMine) {
            bfs.enemies.forEach(function(enemy) {
                if (enemy.hp > 0) {
                    if (tm.geom.Vector2(this.x-enemy.x, this.y-enemy.y).length() < 20) {
                        bfs.Explode(this.x, this.y).setRotation(Math.rand(0, 360)).addChildTo(bfs.sea.topLayer);
                        playSound("soundExplosion");
                        enemy.damage();
                        if (this.parent) this.remove();
                    }
                }
            }.bind(this));
        } else if (bfs.myShip.hp > 0) {
            if (tm.geom.Vector2(this.x-bfs.myShip.x, this.y-bfs.myShip.y).length() < 20) {
                bfs.Explode(this.x, this.y).setRotation(Math.rand(0, 360)).addChildTo(bfs.sea.topLayer);
                playSound("soundExplosion");
                bfs.myShip.damage();
                if (this.parent) this.remove();
            }
        }

        this.age += 1;
        if (this.age > this.limit) {
            bfs.Splash(this.x, this.y).addChildTo(bfs.sea.topLayer);
            bfs.Hamon(this.x, this.y, 1.0).addChildTo(bfs.sea.bottomLayer);
            playSound("soundSplash");
            if (this.parent) this.remove();
        }
    },

});

tm.define("bfs.Explode", {
    superClass: tm.display.AnimationSprite,

    init: function(x, y, scale) {
        if (!scale) scale = 1;
        this.superInit(tm.asset.SpriteSheet({
            image: "explosion",
            frame: {
                width: 100,
                height: 100,
                count: 64
            },
            animations: {
                "exp": {
                    frames: [].range(0, 32),
                    next: null,
                    frequency: 1
                }
            }
        }), 100, 100);
        this.setPosition(x, y).setScale(scale);
        this.gotoAndPlay("exp");
    },

    update: function() {
        if (this.currentFrameIndex === 32) this.remove();
    },

});

tm.define("bfs.Hamon", {
    superClass: tm.display.CircleShape,

    s: 1,

    init: function(x, y, initialAlpha) {
        this.superInit(20, 20, {
            strokeStyle: "transparent",
            fillStyle: tm.graphics.RadialGradient(10, 10, 0, 10, 10, 10)
                .addColorStopList([
                    { offset: 0.0, color: "rgba(255,255,255,0.0)" },
                    { offset: 0.5, color: "rgba(255,255,255,0.0)" },
                    { offset: 1.0, color: "rgba(255,255,255,0.5)" },
                ])
                .toStyle(),
        });
        this.setPosition(x, y);

        this.s = 1;
        this.alpha = initialAlpha;
        this.blendMode = "lighter";
    },

    update: function() {
        this.setScale(this.s);
        this.alpha *= 0.99;
        this.s += 0.01;
        if (this.alpha < 0.01) this.remove();
    },

});

tm.define("bfs.Splash", {
    superClass: tm.display.AnimationSprite,

    init: function(x, y) {
        this.superInit(tm.asset.SpriteSheet({
            image: "splash",
            frame: {
                width: 100,
                height: 100,
                count: 64
            },
            animations: {
                "splash": {
                    frames: [].range(0, 16).concat([].range(14, -1)),
                    next: null,
                    frequency: 1
                }
            }
        }), 100, 100);
        this.gotoAndPlay("splash");
        this.setPosition(x, y-30);
        this.blendMode = "lighter";
    },

    update: function() {
        if (this.currentFrameIndex === 32) this.remove();
    },

});

tm.define("bfs.SplashL", {
    superClass: tm.display.AnimationSprite,

    init: function(x, y) {
        this.superInit(tm.asset.SpriteSheet({
            image: "splash",
            frame: {
                width: 100,
                height: 100,
                count: 64
            },
            animations: {
                "splash": {
                    frames: [].range(0, 16).concat([].range(14, -1)),
                    next: null,
                    frequency: 3
                }
            }
        }), 300, 300);
        this.gotoAndPlay("splash");
        this.setPosition(x, y-30);
        this.blendMode = "lighter";
    },

    update: function() {
        if (this.currentFrameIndex === 32) this.remove();
    },

});

tm.define("bfs.Lader", {
    superClass: tm.display.CanvasElement,

    init: function() {
        this.superInit();
    },

    draw: function(canvas) {
        canvas.fillStyle = "rgba(0, 0, 0, 0.5)";
        canvas.fillRect(-75, -75, 150, 150);
        canvas.fillStyle = "blue";
        canvas.fillRect(-2, -2, 4, 4);
        canvas.strokeStyle = "rgba(255, 255, 255, 0.8)";
        canvas.lineWidth = 0.1;
        canvas.drawLine(-75, 0, 75, 0);
        canvas.drawLine(0, -75, 0, 75);
        canvas.fillStyle = "red";
        bfs.enemies.forEach(function(enemy) {
            var x = (enemy.x - bfs.myShip.x) / 100;
            var y = (enemy.y - bfs.myShip.y) / 100;
            canvas.fillRect(x-1, y-1, 2, 2);
        });
    },

});

bfs.isHitElement = function(me, another) {
    var getBoundingRect = function(sprite) {
        return tm.geom.Rect(
            sprite.x - sprite.width*sprite.originX * sprite.scaleX * 0.8,
            sprite.y - sprite.height*sprite.originY * sprite.scaleY * 0.8,
            sprite.width * sprite.scaleX * 0.8,
            sprite.height * sprite.scaleY * 0.8
        );
    };

    var bx = function(a, b) {
        var abr = getBoundingRect(a);
        var bbr = getBoundingRect(b);
        var L = tm.geom.Vector2().setDegree(b.rotation, 1);
        var ea1 = tm.geom.Vector2().setDegree(a.rotation, 1).mul(abr.width/2);
        var ea2 = tm.geom.Vector2().setDegree(a.rotation + 90, 1).mul(abr.height/2);

        var ra = Math.abs(tm.geom.Vector2.dot(L, ea1)) + Math.abs(tm.geom.Vector2.dot(L, ea2));
        var rb = bbr.width / 2;

        var interval = Math.abs(tm.geom.Vector2.dot(tm.geom.Vector2(a.x-b.x, a.y-b.y), L));

        return interval < ra+rb;
    };

    var by = function(a, b) {
        var abr = getBoundingRect(a);
        var bbr = getBoundingRect(b);
        var L = tm.geom.Vector2().setDegree(b.rotation + 90, 1);
        var ea1 = tm.geom.Vector2().setDegree(a.rotation, 1).mul(abr.width/2);
        var ea2 = tm.geom.Vector2().setDegree(a.rotation + 90, 1).mul(abr.height/2);

        var ra = Math.abs(tm.geom.Vector2.dot(L, ea1)) + Math.abs(tm.geom.Vector2.dot(L, ea2));
        var rb = bbr.height / 2;

        var interval = Math.abs(tm.geom.Vector2.dot(tm.geom.Vector2(a.x-b.x, a.y-b.y), L));

        return interval < ra+rb;
    };

    return bx(me, another) && by(me, another) && bx(another, me) && by(another, me);
};
