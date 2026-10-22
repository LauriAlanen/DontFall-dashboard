# DontFall-dashboard

The PC dashboard for the [DontFall](https://github.com/LauriAlanen/DontFall)
robot: Foxglove layouts and, later, custom Foxglove panels. Runs on the PC
only; the robot serves no web pages, it offers its ROS 2 interface and
this talks to it (plan: `DontFall/docs/dashboard-plan.md`).

```
 Foxglove (Windows)  <-- ws://localhost:8765 -->  foxglove_bridge  <-- DDS, LAN -->  board
                                                  (DontFall/pc/ros.sh bridge)
```

## Use

1. Board up, then on the PC: `~/Projects/DontFall/pc/ros.sh bridge`
2. Foxglove: Open connection -> Foxglove WebSocket -> `ws://localhost:8765`
3. Layouts -> Import from file -> `layouts/dontfall.json`

## Layout `layouts/dontfall.json`

- Plots: tilt (roll/pitch in degrees, via Foxglove's `.@rpy`), gyro, and
  `/cmd_vel` as sent from the PC
- Armed badge from `/diagnostics.status[1]`, the M4 supervisor status
  (amber = disarmed or no data)
- ARM / DISARM: `/dontfall_m4/arm` (`std_srvs/SetBool`)
- Teleop on `/cmd_vel` at 10 Hz; the M4 zeroes it 500 ms after the last
  message, and ignores it while disarmed
- Diagnostics summary and raw `/diagnostics`: what the M4 actually uses

After changing the layout in Foxglove, export it over `layouts/dontfall.json`.

## Panels `dontfall-panels/`

A Foxglove extension (TypeScript + React):

- **DontFall status**: armed / disarmed / no data badge, supervisor and
  IMU state, age of the last `/diagnostics`

Build and install:

```sh
cd dontfall-panels
npm install          # once
npm run lint
npm run package      # -> dontfall.dontfall-panels-<version>.foxe
```

Drag the `.foxe` file onto the Foxglove window (from Windows:
`\\wsl$\<distro>\home\...\DontFall-dashboard\dontfall-panels\`), then add
the panel by name.
