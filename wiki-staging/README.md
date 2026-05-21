# wiki-staging

Markdown copies of every wiki walkthrough that changed (or was added) on
the `ros2-migration` branch, prepared for the GitHub Wiki.

The GitHub Wiki lives in a separate Git repo
(`https://github.com/nicholasaleks/Damn-Vulnerable-Drone.wiki.git`), not
in this code repo. When you merge this branch:

1. Clone the wiki repo locally:
   ```
   git clone https://github.com/nicholasaleks/Damn-Vulnerable-Drone.wiki.git
   ```
2. Copy each file from `wiki-staging/` into the wiki repo root.
   The filenames already match the URL slugs linked from the project
   `Readme.md`.
3. Commit and push the wiki repo.

| File | Purpose |
|---|---|
| `Camera-Feed-ROS-Topic-Flooding.md` | **Rewrite** of the existing wiki page — replaces ROS 1 rospy script with rclpy + Cyclone DDS. |
| `ROS-2-DDS-Graph-Enumeration.md` | **New** — Scenario A (Reconnaissance). |
| `ROS-2-Rogue-Publisher-Injection.md` | **New** — Scenario B (Injection). Includes the companion `ros2_rogue_publisher.py` script. |
| `ROS-2-Topic-Replay.md` | **New** — Scenario C (Exfiltration). Bag-replay variant; SROS 2 was deferred per the migration plan escape hatch. |

The in-repo YAML walkthroughs at
`simulator/mgmt/templates/pages/attacks/**/*.yaml` are the source of truth
for the management web console at `http://localhost:8000`. These MD files
are a parallel copy for the public GitHub Wiki — keep them in sync if you
edit either one.
