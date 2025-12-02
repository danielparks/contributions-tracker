//! contributions-tracker executable.

use std::io::Write;
use std::process::ExitCode;

mod logging;
mod params;

use params::{Params, Parser};

/// Wrapper to handle errors.
///
/// See [`cli()`].
fn main() -> ExitCode {
    let params = Params::parse();
    cli(&params).unwrap_or_else(|error| {
        tracing::debug!("Exiting with error: {error:#?}");
        let error = format!("{error}\n");
        if error.to_lowercase().starts_with("error") {
            params.warn(error).unwrap();
        } else {
            params.warn(format!("Error: {error}")).unwrap();
        }

        ExitCode::FAILURE
    })
}

/// Do the actual work.
///
/// Returns the exit code to use.
///
/// # Errors
///
/// This returns any errors encountered during the run so that they can be
/// outputted nicely in [`main()`].
fn cli(params: &Params) -> anyhow::Result<ExitCode> {
    logging::init(params.verbose)?;

    params.out_stream().write_all(b"Hello\n")?;
    tracing::trace!("about to exit");

    Ok(ExitCode::SUCCESS)
}
