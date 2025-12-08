//! Various logging functions.

use anyhow::bail;
use slog::{Drain, Level, Logger};

/// Initialize logging for the executable.
///
/// Creates and returns a slog logger configured based on the verbosity level.
pub fn init(verbose: u8) -> anyhow::Result<Logger> {
    let level = match verbose {
        4.. => bail!("-v is only allowed up to 3 times."),
        3 => Level::Trace,
        2 => Level::Debug,
        1 => Level::Info,
        0 => Level::Warning,
    };

    let decorator = slog_term::TermDecorator::new().build();
    let drain = slog_term::FullFormat::new(decorator).build().fuse();
    let drain = slog_async::Async::new(drain)
        .chan_size(256)
        .build()
        .filter_level(level)
        .fuse();

    Ok(Logger::root(drain, slog::o!()))
}
