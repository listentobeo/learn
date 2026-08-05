# Beo Personal Studio — 3D game

The Personal Studio is rendered inside the existing Next.js student app with React Three Fiber and Three.js. It deliberately does not use Cocos Creator: the `cocos-engine` repository is the runtime paired with the Cocos Creator editor, while this implementation needs to share the school's Supabase authentication, signed assignment images, inventory and route shell directly.

## Student loop

1. A quiz awards only new progress: completion XP, answer milestones, and a perfect-score bonus.
2. A staged reward screen shows the score, XP, Gold Brushes and current level before answer review.
3. Gold Brushes buy frames, room decor, themes and practice resources.
4. Submitted assignments appear as real textured frames in the Personal Studio.
5. Explore mode supports orbit, pan, zoom and five camera destinations.
6. Arrange mode supports drag, wall transfer, resize, rotation and owned-frame selection.
7. Saved transforms are checked against the signed-in student's assignment and inventory in Supabase.
8. Explore mode also provides third-person WASD/arrow movement, an on-screen mobile pad, walking animation, furniture collision and a constrained follow camera.
9. Wall signs, artwork captions, certificates and the student's jacket name are canvas textures mounted on real meshes, so they obey perspective and occlusion.
10. Only genuine Storage-backed assignment uploads enter the gallery. An authenticated same-origin route streams each image into its frame.

## Database deployment

Run `supabase/migrations/20260806_real_3d_studio_and_score_rewards.sql` after the two earlier gamification migrations. It adds 3D transform columns, backfills up to 36 unique gallery positions, exposes the secure transform RPC and changes future quiz rewards to score/improvement-based awards.

Then run `supabase/migrations/20260807_constrain_3d_studio_artwork.sql`. It prevents students from saving a resized or rotated frame outside its wall panel.

## Controls

- Desktop Explore: use WASD or the arrow keys to walk and turn. Edge arrows and room dots provide fast travel.
- Mobile Explore: use the five-button movement pad. Room dots provide fast travel.
- Arrange: orbit and zoom the camera to inspect the gallery.
- Arrange: select an artwork, drag it, or use the toolbar for fine positioning; press Save to persist it.

The Canvas has a non-WebGL fallback. Device pixel ratio is capped at 1.5, shadows are limited, and 3D code is dynamically loaded only on the Studio route.
