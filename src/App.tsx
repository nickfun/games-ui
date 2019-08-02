import React from 'react';
import './App.css';
import axios from 'axios';
import Dropdown from 'react-bootstrap/Dropdown';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container'
import Nav from 'react-bootstrap/Nav';
import Form from 'react-bootstrap/Form';
import Moment from 'moment';

interface System {
  id: number;
  name: string;
  company: string;
  release: string;
  comments: string;
}

interface Game {
  id: number;
  sysid: number;
  name: string;
  comment: string;
  release: string;
  has_case: number;
  has_docs: number;
  is_ghit: number;
  is_limited: number;
  is_complete: number;
  is_broken: number;
}

const FALLBACKSYSTEM: System = {
  id: -1,
  name: "UNKNOWN",
  company: "",
  release: "0000-00-00",
  comments: ""
}

interface Stats {
  [sysid: number]: number;
}

// const ALL_SYSTEMS: System[] = require('./data/systems.json')
// const ALL_GAMES: Game[] = require('./data/games.json')

enum SCREENS {
  GAME_LIST,
  SEARCH,
  EDIT_GAME,
  EDIT_SYSTEM,
  STATS,
}

interface AppState {
  games: Game[],
  systems: System[],
  currentSystem: number;
  currentGame: number;
  query: string;
  screen: SCREENS;
  loading: boolean;
  error: boolean | string;
}

const DEFAULT_STATE: AppState = {
  games: [], // ALL_GAMES,
  systems: [], // ALL_SYSTEMS.sort(systemCompare),
  currentGame: -1,
  currentSystem: -1,
  query: '',
  screen: SCREENS.GAME_LIST,
  loading: true,
  error: false,
};

interface APPDATA extends AppState {
  setCurrentGame: (id: number) => void;
  setCurrentSystem: (id: number) => void;
  setQuery: (q: string) => void;
  setScreen: (s: SCREENS) => void;
}

/*
================

HELPERS

================
*/

function systemById(id: number, allSystems: System[]): System | undefined {
  return allSystems.find((s, i, a) => {
    return s.id === id;
  });
}

function buildStats(allGames: Game[], allSystems: System[]): Stats {
  const s: Stats = {};
  allGames.forEach(game => {
    if (s[game.sysid]) {
      s[game.sysid]++;
    } else {
      s[game.sysid] = 1;
    }
  });
  return s;
}

function fetchAllData() {
  const games = axios.get('/games')
  const systems = axios.get('/systems')
  return axios.all([games, systems]).then(results => {
    const setupGames = results[0].data.map((gameRow: any) => {
      return {
        ...gameRow,
        id: Number(gameRow.id),
        sysid: Number(gameRow.sysid)
      }
    });
    const setupSystems = results[1].data.map((sysRow: any) => {
      sysRow.id = Number(sysRow.id);
      sysRow.num = Number(sysRow.num);
      return sysRow;
    });
    const sortSystems = setupSystems.sort(systemCompare);

    const data = {
      games: setupGames,
      systems: sortSystems,
    }
    console.log("all the data is", data);
    return data;
  });
}

function gamesForSystem(allGames: Game[], systemid: number): Game[] {
  return allGames.filter((g) => Number(g.sysid) === Number(systemid));
}

function getCurrentSystem(props: APPDATA): System | undefined {
  if (props.currentSystem === -1) {
    return undefined;
  }
  return props.systems.find((s) => {
    return s.id === props.currentSystem;
  });
}

function getCurrentGame(props: APPDATA): Game | undefined {
  if (props.currentGame === -1) {
    return undefined;
  }
  return props.games.find((g) => {
    return g.id === props.currentGame;
  })
}

function getSystemForGame(game: Game, allSystems: System[]): System {
  const found = allSystems.find((s) => {
    return s.id === game.sysid
  });
  if (found) {
    return found;
  }
  return FALLBACKSYSTEM;
}

function searchGames(props: APPDATA): Game[] {
  var results: Game[] = [];
  if (props.query.length < 2) {
    return results;
  }
  const q = props.query.toLowerCase();
  return props.games.filter((g) => {
    if (g.name.toLowerCase().indexOf(q) >= 0) {
      return true;
    }
    if (g.comment.toLowerCase().indexOf(q) >= 0) {
      return true;
    }
    return false;
  })
}

function systemCompare(a: System, b: System): number {
  if (a.company > b.company) {
    return 1;
  }
  if (a.company < b.company) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }
  if (a.name < b.name) {
    return -1;
  }
  return 0;
}

function gameCompare(a: Game, b: Game): number {
  if (a.name > b.name) {
    return 1;
  }
  if (a.name < b.name) {
    return -1;
  }
  return 0;
}

function sortGames(g: Game[]): Game[] {
  return g.sort(gameCompare);
}

/* 
===============

APP CONTAINER

===============
*/

export class AppContainer extends React.Component<{}, AppState> {
  state: AppState = DEFAULT_STATE;

  constructor(props: any) {
    super(props)
    window.onhashchange = this.hashRouter.bind(this);
  }

  componentDidMount() {
    this.hashRouter();
    fetchAllData().then(gameData => {
      console.log("setting data to", gameData);
      this.setState({
        games: gameData.games,
        systems: gameData.systems,
        loading: false,
      });
    }).catch(errs => {
      console.log("Errors!", errs);
      this.setState({
        loading: false,
        error: `message: ${errs}`
      })
    })
  }

  hashRouter(): void {
    console.log("hashRouter");
    const hash = window.location.hash;
    const parts = hash.split("/");
    if (parts.length === 3) {
      if (parts[1] === "system") {
        this.setState({
          currentGame: -1,
          currentSystem: Number(parts[2]),
          screen: SCREENS.GAME_LIST
        });
      }
      if (parts[1] === "edit-system") {
        this.setState({
          currentGame: -1,
          currentSystem: Number(parts[2]),
          screen: SCREENS.EDIT_SYSTEM,
        })
      }
      if (parts[1] === "edit-game") {
        this.setState({
          currentGame: Number(parts[2]),
          currentSystem: -1,
          screen: SCREENS.EDIT_GAME,
        })
      }
    }
    if (parts.length === 2) {
      if (parts[1] === 'index') {
        this.setState({
          currentGame: -1,
          currentSystem: -1,
          screen: SCREENS.GAME_LIST
        })
      }
      if (parts[1] === 'search') {
        this.setState({
          currentGame: -1,
          currentSystem: -1,
          screen: SCREENS.SEARCH
        })
      }
      if (parts[1] === "stats") {
        this.setState({
          screen: SCREENS.STATS,
        });
      }
    }
  }

  setCurrentGame(id: number) {
    console.log("setCurrentGame");
    this.setState({
      currentGame: Number(id)
    });
  }

  setCurrentSystem(id: number) {
    console.log("setCurrentSystem")
    this.setState({
      currentSystem: Number(id)
    });
  }

  setQuery(q: string) {
    this.setState({
      query: q
    });
  }

  setScreen(s: SCREENS) {
    this.setState({
      screen: s
    });
  }

  render() {
    console.log('AppContainer', this.state);
    const allProps = {
      ...this.state,
      setCurrentGame: this.setCurrentGame.bind(this),
      setCurrentSystem: this.setCurrentSystem.bind(this),
      setQuery: this.setQuery.bind(this),
      setScreen: this.setScreen.bind(this),
    }
    if (this.state.loading) {
      return (<h2>...loading...</h2>);
    }
    if (this.state.error !== false) {
      return (<div><h2>ERROR</h2><p>{this.state.error}</p></div>);
    }
    switch (this.state.screen) {
      case SCREENS.SEARCH:
        return <SearchScreen {...allProps} />;
      case SCREENS.EDIT_GAME:
        return <EditGameScreen {...allProps} />;
      case SCREENS.EDIT_SYSTEM:
        return <EditSystemScreen {...allProps} />;
      case SCREENS.STATS:
        return <StatsScreen {...allProps} />;
      default:
        return <MainList {...allProps} />;
    }
  }
}

/*
=====================

COMPONENTS

=====================
*/

const MainList: React.FC<APPDATA> = (props) => {
  const currentSystem = getCurrentSystem(props);
  console.log('currentSystem', currentSystem);
  var gamesToShow: Game[];
  if (props.currentSystem === -1) {
    gamesToShow = props.games;
  } else {
    gamesToShow = gamesForSystem(props.games, props.currentSystem);
  }
  gamesToShow = sortGames(gamesToShow);

  return (
    <div>
      <h1>Game Catalog</h1>
      <NavMenu {...props} />

      <Container>
        <Row>
          <Col>
            <Dropdown>
              <Dropdown.Toggle id="select-system">
                Choose System
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item href="#/index">-No System-</Dropdown.Item>
                {props.systems.map((sys) => {
                  const url = `#/system/${sys.id}`
                  return (
                    <Dropdown.Item href={url} key={"sys-" + sys.id}>{sys.company} {sys.name}</Dropdown.Item>
                  )
                })}
              </Dropdown.Menu>
            </Dropdown>
          </Col>
        </Row>
      </Container>

      {<SystemInfo system={currentSystem} />}
      <GamesTable games={gamesToShow} systems={props.systems} />
    </div>
  );
}

const SystemInfo: React.FunctionComponent<{ system?: System }> = (props) => {
  if (!props.system) {
    return <Container className="system-container"><Row><Col>No System. Showing all games.</Col></Row></Container>
  }
  return (
    <Container className="system-container">
      <Row>
        <Cell>
          <strong>{props.system.company} {props.system.name}</strong>
        </Cell>
        <Cell>
          <FDate date={props.system.release} />
        </Cell>
        <Cell>
          {props.system.comments}
          <Button variant="link" size="sm">Edit</Button>
        </Cell>
      </Row>
    </Container>
  )
}

const NavMenu: React.FC<APPDATA> = (props) => {
  var active = '#/index';
  var edit = null;
  switch (props.screen) {
    case SCREENS.SEARCH:
      active = '#/search';
      break;
    case SCREENS.EDIT_GAME:
      active = '#'
      edit = <Nav.Item><Nav.Link href="#">Edit Game</Nav.Link></Nav.Item>;
      break;
    case SCREENS.EDIT_SYSTEM:
      active = '#'
      edit = <Nav.Item><Nav.Link href="#">Edit System</Nav.Link></Nav.Item>;
      break;
    case SCREENS.STATS:
      active = '#/stats';
      break;
  }
  return (
    <Nav variant="tabs" defaultActiveKey={active}>
      <Nav.Item>
        <Nav.Link href="#/index">List</Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link href="#/search">Search</Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link href="#/stats">Stats</Nav.Link>
      </Nav.Item>
      {edit}
    </Nav>
  );
}

const StatsScreen: React.FC<APPDATA> = (props) => {
  const stats = buildStats(props.games, props.systems);
  const perSystem: JSX.Element[] = [];
  var keyid = 1;
  Object.keys(stats).forEach(idx => {
    const i = Number(idx);
    const s = systemById(i, props.systems);
    if (s === undefined) {
      return;
    }
    const c = stats[i];
    perSystem.push(<dt key={keyid}>{s.company} {s.name}</dt>);
    keyid++;
    perSystem.push(<dd key={keyid}>{c}</dd>);
    keyid++;
  });
  return (
    <div>
      <h1>Stats</h1>
      <NavMenu {...props} />
      <Container>
        <Row>
          <Col>
            <h3>Overall</h3>
            <p>{props.games.length} Games</p>
            <p>{props.systems.length} Systems</p>
            <h3>Per System</h3>
            <dl>{perSystem}</dl>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

const GamesTable: React.FC<{ games: Game[], systems: System[], showSystem?: boolean }> = (props) => {
  const sorted = sortGames(props.games);
  const rows = sorted.map((game: Game) => {
    const system = getSystemForGame(game, props.systems);
    var systemCell = null;
    if (props.showSystem) {
      systemCell = <Cell>{system.company} {system.name}</Cell>
    }
    const badges: JSX.Element[] = [];
    const badgeMap: {[k: string]: string} = {
      'has_case': 'CASE',
      'has_docs': 'DOCS',
      'is_ghit': 'GHIT',
      'is_limited': 'LIM',
      'is_complete': 'COM',
      'is_broken': 'B!',
    };
    for (const k of Object.keys(badgeMap)) {
      const agame: any = game;
      if (game.hasOwnProperty(k) && Number(agame[k]) === 1) {
        badges.push(<span key={k}>[{badgeMap[k]}]</span>)
      }
    }
    const keyid = `game-${game.id}`
    const editUrl = `#!/edit-game/${game.id}`
    const safe = encodeURIComponent([game.name, system.company, system.name].join(' '))
    const ebay = `https://www.ebay.com/sch/i.html?_nkw=${safe}&_sacat=0`
    const moby = `https://www.mobygames.com/search/quick?q=${safe}`
    const wiki = `https://en.wikipedia.org/w/index.php?search=${safe}`
    return (
      <Row key={keyid} className="game-row">
        <Cell className="game-name">{game.name}</Cell>
        <Cell><FDate date={game.release} /></Cell>
        <Cell>{game.comment}</Cell>
        {systemCell}
        <Cell className="game-actions">
          <a href={ebay} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">Ebay</a>
          <a href={moby} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">Moby</a>
          <a href={wiki} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">Wiki</a>
          <Button href={editUrl} size="sm" variant="info">Edit</Button>
        </Cell>
        <Cell className="game-badges">
          {badges}
        </Cell>
      </Row>
    )
  });
  return (
    <Container>
      <Row><Col><h3>{props.games.length} Games</h3></Col></Row>
      {rows}
    </Container>
  );
}

const FDate: React.FC<{date: string}> = (props) => {
  if (props.date === '0000-00-00') {
    return null;
  }
  const m = Moment(props.date, 'YYYY-MM-DD');
  const f = m.format('MMMM Do YYYY')
  return <span>{f}</span>
}

function checked(c: Number): boolean {
  return c === 1;
}

const EditGameScreen: React.FC<APPDATA> = (props) => {
  const game = getCurrentGame(props);
  if (!game) {
    return <h1>Not Found</h1>;
  }
  const system = getSystemForGame(game, props.systems);
  console.log("Game is", game);
  return (
    <div>
      <h1>Edit Game</h1>
      <NavMenu {...props} />
      <Container>
        <Row>
          <Col>
            <Form>
              <Form.Group controlId="game-name">
                <Form.Label>Game Name</Form.Label>
                <Form.Control type="text" placeholder="name" value={game.name} />
              </Form.Group>

              <Form.Group controlId="game-system">
                <Form.Label>System</Form.Label>
                <SystemDropdown systems={props.systems} selected={system.id} onChange={(e: any)=>{}} />
              </Form.Group>

              <Form.Group controlId="game-comments">
                <Form.Label>Comments</Form.Label>
                <Form.Control rows="5" as="textarea" placeholder="name" value={game.comment} />
              </Form.Group>

              <Form.Group controlId="game-release">
                <Form.Label>Release Date</Form.Label>
                <Form.Control as="input" type="date" placeholder="name" value={game.release} />
              </Form.Group>

              <Form.Group controlId="game-metadata">
                <Form.Check checked={checked(game.has_case)} id="has_case" type="checkbox" label="Has Case?" />
                <Form.Check checked={checked(game.has_docs)} id="has_docs" type="checkbox" label="Has Documents?" />
                <Form.Check checked={checked(game.is_complete)} id="is_complete" type="checkbox" label="Is Complete?" />
                <Form.Check checked={checked(game.is_ghit)} id="is_ghit" type="checkbox" label="Is Greatest Hits?" />
                <Form.Check checked={checked(game.is_limited)} id="is_limited" type="checkbox" label="Is Limited Edition?" />
                <Form.Check checked={checked(game.is_broken)} id="is_broken" type="checkbox" label="Is Broken?" />
              </Form.Group>
              <Button variant="primary" type="button">
                Submit
              </Button>
            </Form>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

interface SystemDropdownProps {
  systems: System[];
  selected: number;
  onChange: (sysid: number) => void;
}

const SystemDropdown: React.FC<SystemDropdownProps> = (props) => {
  const rows = props.systems.map((s) => {
    const sel = (s.id === props.selected);
    if (sel) {
      return <option value={s.id} selected>{s.company} {s.name}</option>
    }
    return <option value={s.id}>{s.company} {s.name}</option>
  });
  return (
    <Form.Control as="select" name="system" onChange={(e: any) => props.onChange(e.target.value)}>
      {rows}
    </Form.Control>
  )
}

const EditSystemScreen: React.FC<APPDATA> = (props) => {
  return <h3>Edit System</h3>
}

const SearchScreen: React.FC<APPDATA> = (props) => {
  const results: Game[] = searchGames(props);
  const handler = (e: any) => props.setQuery(e.target.value);
  const start = (
    <div>
      <h1>Search</h1>
      <NavMenu {...props} />
      <Container>
        <Form action="">
          <Form.Group controlId="search">
            <Form.Label>Search</Form.Label>
            <Form.Control type="text" placeholder="Query" value={props.query} onChange={handler} />
          </Form.Group>
        </Form>
      </Container>
    </div>
  );
  const empty = (
    <Container>
      <p>No Results yet for "{props.query}"</p>
    </Container>
  );
  var show = empty;
  if (results.length > 0) {
    show = (
      <Container>
        <GamesTable games={results} systems={props.systems} showSystem={true} />
      </Container>
    );
  }
  return (
    <div>
      {start}
      {show}
    </div>
  )
}

function Cell(props: any) {
  const { children, ...rest} = props;
  return (<Col xs={12} md={4} {...rest}>{props.children}</Col>);
}

export default AppContainer;
