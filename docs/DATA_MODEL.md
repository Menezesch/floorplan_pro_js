# Data Model & XML Schema

Canonical storage uses **meters**.

Entities:
- `Wall`: centerline points, thickness, derived polygon, room side references.
- `Room`: boundary polygon, area/perimeter, label position.
- `Obstacle`: no-go polygon.
- `Opening`: phase-2 wall opening scaffold.

XML root:
```xml
<project version="1.0" units="m">
  <meta name="" created="" modified="" grid="0.1" />
  <walls><wall id="" thickness="" roomsLeft="" roomsRight=""><centerline>0,0 1,0</centerline></wall></walls>
  <rooms><room id="" name=""><boundary>0,0 1,0 1,1 0,1</boundary></room></rooms>
  <obstacles><obstacle id="" type="no_go"><polygon>...</polygon></obstacle></obstacles>
  <openings><opening id="" wallId="" distanceAlong="" width="" type="door" orientation="left"/></openings>
</project>
```
