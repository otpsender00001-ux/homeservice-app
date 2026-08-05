<?php
session_start();
session_unset();   // optional but recommended
session_destroy();

header("Location: ../../index.html");
exit();
?>