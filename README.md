# Invisible Display with Animated GIFs
HTML/NodeJS based Invisible Display system for adding virtual stickers and animated gifs to tinted acrylic panels. 

The display your using should be IPS, high brightness, and high contrast to minimise the breaking of the illusion

The panel is displayed in 3 layers
* public/foreground.jpg - Front most layer of stickers or a image (must be transparent)
* public/images/*.gif - Randomly selected GIF animation that is displayed and swapped
* public/background.jpg - Layer of stickers or image

Run the app.js in the background and launch the display as a kiosk edge/chrome window
