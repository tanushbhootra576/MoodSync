import React from 'react';
import { NavLink } from 'react-router-dom';
import './NavBar.css';

function NavBar() {
    return (
        <nav className="navbar">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                Home
            </NavLink>
            <NavLink to="/playlist" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                Playlist
            </NavLink>
            <NavLink to="/about" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                About
            </NavLink>
        </nav>
    );
}

export default NavBar;
