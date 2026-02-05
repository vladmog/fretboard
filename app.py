"""Flask application for fretboard visualization."""

from flask import Flask, render_template

app = Flask(__name__)


@app.route("/")
def index():
    """Serve the main fretboard visualization page."""
    return render_template("index.html")


# Future API endpoints for scales, chords, etc.
# @app.route("/api/scales")
# @app.route("/api/chords")


if __name__ == "__main__":
    app.run(debug=True)
