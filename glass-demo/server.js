const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.static('public'));

// Dummy Data
const dummyData = {
  teams: [
    {
      id: 1,
      name: "Riverside High Volleyball",
      season: "Fall 2025",
      division: "Varsity",
      coach: "Sarah Johnson"
    }
  ],
  
  players: [
    {
      id: 1,
      firstName: "Emma",
      lastName: "Martinez",
      jerseyNumber: 12,
      position: "Outside Hitter",
      skillLevel: 4,
      height: "5'8\"",
      year: "Junior",
      stats: {
        kills: 145,
        blocks: 23,
        aces: 31,
        digs: 89
      }
    },
    {
      id: 2,
      firstName: "Olivia",
      lastName: "Chen",
      jerseyNumber: 8,
      position: "Setter",
      skillLevel: 5,
      height: "5'6\"",
      year: "Senior",
      stats: {
        assists: 298,
        kills: 34,
        aces: 18,
        digs: 67
      }
    },
    {
      id: 3,
      firstName: "Sophia",
      lastName: "Williams",
      jerseyNumber: 15,
      position: "Middle Blocker",
      skillLevel: 4,
      height: "6'1\"",
      year: "Sophomore",
      stats: {
        kills: 89,
        blocks: 67,
        aces: 12,
        digs: 45
      }
    },
    {
      id: 4,
      firstName: "Ava",
      lastName: "Thompson",
      jerseyNumber: 6,
      position: "Libero",
      skillLevel: 5,
      height: "5'4\"",
      year: "Senior",
      stats: {
        kills: 8,
        blocks: 0,
        aces: 15,
        digs: 234
      }
    },
    {
      id: 5,
      firstName: "Isabella",
      lastName: "Davis",
      jerseyNumber: 3,
      position: "Right Side",
      skillLevel: 3,
      height: "5'10\"",
      year: "Junior",
      stats: {
        kills: 78,
        blocks: 34,
        aces: 22,
        digs: 56
      }
    },
    {
      id: 6,
      firstName: "Mia",
      lastName: "Rodriguez",
      jerseyNumber: 11,
      position: "Outside Hitter",
      skillLevel: 4,
      height: "5'9\"",
      year: "Sophomore",
      stats: {
        kills: 112,
        blocks: 18,
        aces: 28,
        digs: 72
      }
    }
  ],

  drills: [
    {
      id: 1,
      name: "Pepper Warm-up",
      category: "Warm-up",
      duration: 10,
      difficulty: 2,
      description: "Basic partner passing and setting to warm up",
      equipment: ["Volleyballs"],
      minPlayers: 2,
      maxPlayers: 12,
      focus: ["Passing", "Setting", "Ball Control"]
    },
    {
      id: 2,
      name: "Attack Line Hitting",
      category: "Offense",
      duration: 20,
      difficulty: 4,
      description: "Practice attacking from different positions along the net",
      equipment: ["Volleyballs", "Net"],
      minPlayers: 6,
      maxPlayers: 12,
      focus: ["Attacking", "Timing", "Footwork"]
    },
    {
      id: 3,
      name: "Block and Transition",
      category: "Defense",
      duration: 15,
      difficulty: 4,
      description: "Practice blocking and quick transition to offense",
      equipment: ["Volleyballs", "Net"],
      minPlayers: 6,
      maxPlayers: 12,
      focus: ["Blocking", "Transition", "Communication"]
    },
    {
      id: 4,
      name: "Serve and Pass",
      category: "Serve/Receive",
      duration: 15,
      difficulty: 3,
      description: "Practice serving accuracy and passing under pressure",
      equipment: ["Volleyballs", "Targets"],
      minPlayers: 4,
      maxPlayers: 8,
      focus: ["Serving", "Passing", "Pressure"]
    }
  ],

  practices: [
    {
      id: 1,
      name: "Championship Prep",
      date: "2025-10-08",
      duration: 120,
      phases: [
        {
          id: 1,
          name: "Dynamic Warm-up",
          duration: 15,
          type: "warmup",
          drills: [1]
        },
        {
          id: 2,
          name: "Skill Development",
          duration: 45,
          type: "skill",
          drills: [2, 4]
        },
        {
          id: 3,
          name: "Game Situations",
          duration: 40,
          type: "scrimmage",
          drills: [3]
        },
        {
          id: 4,
          name: "Cool Down",
          duration: 20,
          type: "cooldown",
          drills: []
        }
      ]
    },
    {
      id: 2,
      name: "Fundamentals Focus",
      date: "2025-10-10",
      duration: 90,
      phases: [
        {
          id: 1,
          name: "Warm-up",
          duration: 15,
          type: "warmup",
          drills: [1]
        },
        {
          id: 2,
          name: "Passing & Setting",
          duration: 35,
          type: "skill",
          drills: [4]
        },
        {
          id: 3,
          name: "Attack Practice",
          duration: 25,
          type: "drill",
          drills: [2]
        },
        {
          id: 4,
          name: "Conditioning",
          duration: 15,
          type: "cooldown",
          drills: []
        }
      ]
    }
  ],

  videos: [
    {
      id: 1,
      title: "Perfect Spike Technique",
      category: "Attacking",
      duration: "3:45",
      thumbnail: "/images/spike-thumb.jpg",
      description: "Learn the fundamentals of a powerful volleyball spike with proper approach and contact"
    },
    {
      id: 2,
      title: "Setter Hand Position",
      category: "Setting",
      duration: "2:30",
      thumbnail: "/images/setting-thumb.jpg",
      description: "Master the proper hand positioning for consistent and accurate sets"
    },
    {
      id: 3,
      title: "Defensive Positioning",
      category: "Defense",
      duration: "4:15",
      thumbnail: "/images/defense-thumb.jpg",
      description: "Understanding court positioning and reading the game for effective defense"
    },
    {
      id: 4,
      title: "Serving Accuracy Drills",
      category: "Serving",
      duration: "5:20",
      thumbnail: "/images/serve-thumb.jpg",
      description: "Improve serving consistency and target accuracy with progressive drills"
    },
    {
      id: 5,
      title: "Quick Attack Timing",
      category: "Attacking",
      duration: "3:30",
      thumbnail: "/images/quick-attack-thumb.jpg",
      description: "Perfect the timing between setter and attacker for quick attacks"
    },
    {
      id: 6,
      title: "Passing Fundamentals",
      category: "Defense",
      duration: "6:10",
      thumbnail: "/images/passing-thumb.jpg",
      description: "Basic passing technique, platform formation, and ball control"
    },
    {
      id: 7,
      title: "Blocking Mechanics",
      category: "Defense",
      duration: "4:45",
      thumbnail: "/images/blocking-thumb.jpg",
      description: "Proper blocking technique, timing, and court positioning"
    },
    {
      id: 8,
      title: "Team Rotation Systems",
      category: "Strategy",
      duration: "7:30",
      thumbnail: "/images/rotation-thumb.jpg",
      description: "Understanding 6-2 and 5-1 rotation systems and player movement"
    }
  ]
};

// API Routes
app.get('/api/teams', (req, res) => {
  res.json(dummyData.teams);
});

app.get('/api/players', (req, res) => {
  res.json(dummyData.players);
});

app.get('/api/drills', (req, res) => {
  res.json(dummyData.drills);
});

app.get('/api/practices', (req, res) => {
  res.json(dummyData.practices);
});

app.get('/api/videos', (req, res) => {
  res.json(dummyData.videos);
});

app.get('/api/players/:id', (req, res) => {
  const player = dummyData.players.find(p => p.id === parseInt(req.params.id));
  if (player) {
    res.json(player);
  } else {
    res.status(404).json({ error: 'Player not found' });
  }
});

app.get('/api/drills/:id', (req, res) => {
  const drill = dummyData.drills.find(d => d.id === parseInt(req.params.id));
  if (drill) {
    res.json(drill);
  } else {
    res.status(404).json({ error: 'Drill not found' });
  }
});

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/practice', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'practice.html'));
});

app.get('/roster', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'roster.html'));
});

app.get('/drills', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'drills.html'));
});

app.get('/videos', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'videos.html'));
});

app.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'analytics.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🏐 PracTrac Glass Demo Server running on http://localhost:${PORT}`);
  console.log(`📱 Black Glass UI Demo - Volleyball Practice Management`);
});