import React, { useState } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail, Scale, UserRound } from 'lucide-react';
import './LoginPage.css';

const roles = [
    {
        value: 'ADMIN',
        label: 'Admin',
        description: 'Manage rules, users, and portal settings.'
    },
    {
        value: 'INSPECTOR',
        label: 'Inspector',
        description: 'Scan packages and review compliance reports.'
    },
    {
        value: 'CUSTOMER',
        label: 'Customer',
        description: 'View inspections and compliance information.'
    }
];

export default function LoginPage({ onLogin }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('INSPECTOR');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!name.trim() || !email.trim() || !password) {
            setError('Enter your name, email address, and password to continue.');
            return;
        }

        const selectedRole = roles.find((item) => item.value === role);

        onLogin({
            id: `usr_${role.toLowerCase()}_01`,
            name: name.trim(),
            email: email.trim(),
            role,
            designation: selectedRole.description,
            badgeNumber: role === 'INSPECTOR' ? 'LM-DL-2024-884' : 'Portal User'
        });
    };

    return (
        <main className="login-page">
            <section className="login-intro" aria-labelledby="login-page-title">
                <div className="login-brand-mark" aria-hidden="true">
                    <Scale size={32} strokeWidth={1.8} />
                </div>
                <h1 id="login-page-title">Legal Metrology Compliance Portal</h1>
                <p className="login-intro-copy">
                    A rules-based workspace for packaged commodity inspections, evidence review, and compliance reporting.
                </p>
            </section>

            <section className="login-panel" aria-labelledby="login-form-title">
                <div className="login-panel-heading">
                    <p className="login-kicker">Welcome back</p>
                    <h2 id="login-form-title">Sign in</h2>
                    <p>Use your portal credentials to continue.</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="login-field">
                        <label htmlFor="login-name">Full name</label>
                        <div className="login-input-wrap">
                            <UserRound size={18} aria-hidden="true" />
                            <input
                                id="login-name"
                                name="name"
                                type="text"
                                autoComplete="name"
                                value={name}
                                onChange={(event) => { setName(event.target.value); setError(''); }}
                                placeholder="Enter your full name"
                                required
                            />
                        </div>
                    </div>

                    <div className="login-field">
                        <label htmlFor="login-email">Email address</label>
                        <div className="login-input-wrap">
                            <Mail size={18} aria-hidden="true" />
                            <input
                                id="login-email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={(event) => { setEmail(event.target.value); setError(''); }}
                                placeholder="you@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="login-field">
                        <label htmlFor="login-password">Password</label>
                        <div className="login-input-wrap">
                            <LockKeyhole size={18} aria-hidden="true" />
                            <input
                                id="login-password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                value={password}
                                onChange={(event) => { setPassword(event.target.value); setError(''); }}
                                placeholder="Enter your password"
                                required
                            />
                            <button
                                className="password-toggle"
                                type="button"
                                onClick={() => setShowPassword((visible) => !visible)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                title={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                            </button>
                        </div>
                    </div>

                    <div className="login-field">
                        <label htmlFor="login-role">Role</label>
                        <div className="login-select-wrap">
                            <select
                                id="login-role"
                                name="role"
                                value={role}
                                onChange={(event) => { setRole(event.target.value); setError(''); }}
                            >
                                {roles.map((item) => (
                                    <option value={item.value} key={item.value}>{item.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {error && <p className="login-error" role="alert">{error}</p>}

                    <button className="login-submit" type="submit">
                        Sign in to portal
                    </button>
                    <p className="login-support">Need access? Contact your portal administrator.</p>
                </form>
            </section>
        </main>
    );
}
