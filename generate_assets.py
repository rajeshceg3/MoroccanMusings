import os
import wave
import random
import struct

def create_placeholder_image(path, color, text):
    svg_content = f'''<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="{color}"/>
        <text x="50%" y="50%" font-family="Arial" font-size="50" fill="white" text-anchor="middle" dominant-baseline="middle">{text}</text>
    </svg>'''
    # Saving as .jpg is tricky without PIL/library, but the browser can render SVG in <img> tags if the src ends in .svg
    # However, the code expects .jpg likely for the file extension check or just src.
    # We will save as .svg and update js/data.js to point to .svg
    with open(path.replace('.jpg', '.svg'), 'w') as f:
        f.write(svg_content)

def create_placeholder_audio(path):
    # Generate 1 second of white noise
    duration = 1.0
    sample_rate = 44100
    num_samples = int(duration * sample_rate)

    with wave.open(path, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)

        for _ in range(num_samples):
            value = random.randint(-1000, 1000)
            data = struct.pack('<h', value)
            wav_file.writeframes(data)

def main():
    os.makedirs('assets/images', exist_ok=True)
    os.makedirs('assets/audio', exist_ok=True)

    # Images (Using colors from data.js)
    create_placeholder_image('assets/images/essaouira.jpg', '#4a7c82', 'Essaouira Ramparts')
    create_placeholder_image('assets/images/fes.jpg', '#c67605', 'Fes el-Bali Souk')
    create_placeholder_image('assets/images/sahara.jpg', '#b85b47', 'Erg Chebbi Dunes')

    # Audio
    create_placeholder_audio('assets/audio/essaouira.mp3') # Will be .wav really, but let's stick to what we can gen easily
    create_placeholder_audio('assets/audio/fes.mp3')
    create_placeholder_audio('assets/audio/sahara.mp3')

    # Note: wave library creates .wav files. I should name them .wav and update data.js

if __name__ == '__main__':
    main()
