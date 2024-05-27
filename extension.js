const { St, GLib, Gio, Mainloop } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Soup = imports.gi.Soup;

let contestCountdown;

const CodeforcesAPI = {
    getUpcomingContests(callback) {
        let session = new Soup.Session();
        let request = Soup.Message.new('GET', 'https://codeforces.com/api/contest.list');
        session.queue_message(request, (session, message) => {
            if (message.status_code !== 200) {
                callback(null);
                return;
            }

            let response = JSON.parse(request.response_body.data);
            if (response.status !== 'OK') {
                callback(null);
                return;
            }

            let contests = response.result.filter(contest => contest.phase === 'BEFORE');
            if (contests.length > 0) {
                contests.sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);
                callback(contests[0]);
            } else {
                callback(null);
            }
        });
    }
};

const ContestCountdownIndicator = GObject.registerClass(
    class ContestCountdownIndicator extends PanelMenu.Button {
        _init() {
            super._init(0.0, "Contest Countdown");

            this._label = new St.Label({
                text: "Loading...",
                y_align: Clutter.ActorAlign.CENTER
            });

            this.add_child(this._label);
            this._updateContestInfo();
        }

        _updateContestInfo() {
            CodeforcesAPI.getUpcomingContests((contest) => {
                if (contest) {
                    let startTime = new Date(contest.startTimeSeconds * 1000);
                    this._label.set_text(`Next Contest: ${contest.name} at ${startTime.toLocaleString()}`);
                } else {
                    this._label.set_text("No upcoming contests.");
                }
            });

            Mainloop.timeout_add_seconds(3600, () => {
                this._updateContestInfo();
                return true;
            });
        }
    }
);

function init() {
}

function enable() {
    contestCountdown = new ContestCountdownIndicator();
    Main.panel.addToStatusArea('contest-countdown', contestCountdown);
}

function disable() {
    contestCountdown.destroy();
    contestCountdown = null;
}
